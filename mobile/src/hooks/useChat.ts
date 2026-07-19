import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  createdAt: string;
}

type WsEvent =
  | { type: 'token'; token: string }
  | { type: 'done'; conversationId: string; message: string }
  | { type: 'error'; message: string };

/**
 * Hook de chat em tempo real: mantem uma conexao WebSocket autenticada
 * com o backend e faz streaming token a token. Se o WebSocket falhar
 * (rede instavel, etc.), cai automaticamente para uma chamada HTTP
 * tradicional, para o usuario nunca ficar sem resposta.
 */
export function useChat(conversationId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((s) => s.token);
  const wsUrl = useSettingsStore((s) => s.wsUrl);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setIsLoadingHistory(true);
    apiClient
      .get(`/conversations/${conversationId}/messages`)
      .then((res) => setMessages(res.data.messages))
      .finally(() => setIsLoadingHistory(false));
  }, [conversationId]);

  useEffect(() => {
    if (!token) return;
    const socket = new WebSocket(`${wsUrl}/chat?token=${token}`);
    wsRef.current = socket;
    return () => socket.close();
  }, [token, wsUrl]);

  const sendViaWebSocket = useCallback(
    (content: string, currentConversationId: string | undefined) =>
      new Promise<{ conversationId: string; content: string }>((resolve, reject) => {
        const socket = wsRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket indisponivel'));
          return;
        }

        let accumulated = '';
        const handleMessage = (event: any) => {
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

      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversationId: currentConversationId ?? '',
        role: 'USER',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
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

  return { messages, streamingContent, isSending, isLoadingHistory, sendMessage };
}
