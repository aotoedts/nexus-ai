import { useCallback, useEffect, useRef, useState } from 'react';
import { Message } from '../types/index.js';
import { useAuthStore } from '../store/authStore.js';
import { apiClient } from '../api/client.js';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3333/api/v1/ws';

type WsEvent =
  | { type: 'token'; token: string }
  | { type: 'done'; conversationId: string; message: string }
  | { type: 'error'; message: string };

/**
 * Hook que gerencia o chat em tempo real via WebSocket (com streaming
 * token a token) e faz fallback automatico para HTTP (request/response)
 * caso a conexao WebSocket nao esteja disponivel.
 */
export function useChat(conversationId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    apiClient.get(`/conversations/${conversationId}/messages`).then((res) => {
      setMessages(res.data.messages);
    });
  }, [conversationId]);

  // Mantem uma conexao WebSocket autenticada aberta enquanto o usuario
  // estiver logado, reaproveitada para todas as conversas.
  useEffect(() => {
    if (!token) return;
    const socket = new WebSocket(`${WS_URL}/chat?token=${token}`);
    wsRef.current = socket;
    return () => socket.close();
  }, [token]);

  const sendViaWebSocket = useCallback(
    (content: string, currentConversationId: string | undefined) =>
      new Promise<{ conversationId: string; content: string }>((resolve, reject) => {
        const socket = wsRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket indisponivel'));
          return;
        }

        let accumulated = '';

        const handleMessage = (event: MessageEvent) => {
          const data: WsEvent = JSON.parse(event.data);

          if (data.type === 'token') {
            accumulated += data.token;
            setStreamingContent(accumulated);
          } else if (data.type === 'done') {
            socket.removeEventListener('message', handleMessage);
            resolve({ conversationId: data.conversationId, content: data.message });
          } else if (data.type === 'error') {
            socket.removeEventListener('message', handleMessage);
            reject(new Error(data.message));
          }
        };

        socket.addEventListener('message', handleMessage);
        socket.send(JSON.stringify({ conversationId: currentConversationId, content }));
      }),
    [],
  );

  const sendMessage = useCallback(
    async (content: string, currentConversationId?: string) => {
      setIsSending(true);
      setStreamingContent('');

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: currentConversationId ?? '',
        role: 'USER',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        // Tenta o caminho de tempo real (WebSocket, com streaming).
        const result = await sendViaWebSocket(content, currentConversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            conversationId: result.conversationId,
            role: 'ASSISTANT',
            content: result.content,
            createdAt: new Date().toISOString(),
          },
        ]);
        return result.conversationId;
      } catch {
        // Fallback: requisicao HTTP tradicional (request/response).
        const response = await apiClient.post('/chat/messages', {
          conversationId: currentConversationId,
          content,
        });
        setMessages((prev) => [...prev, response.data.assistantMessage]);
        return response.data.conversationId as string;
      } finally {
        setIsSending(false);
        setStreamingContent('');
      }
    },
    [sendViaWebSocket],
  );

  return { messages, streamingContent, isSending, sendMessage };
}
