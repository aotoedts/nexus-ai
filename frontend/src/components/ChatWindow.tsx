import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Message } from '../types/index.js';
import { MessageBubble } from './MessageBubble.js';

interface Props {
  messages: Message[];
  isSending: boolean;
  streamingContent?: string;
  onSend: (content: string) => void;
}

export function ChatWindow({ messages, isSending, streamingContent, onSend }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-ink-950">
      <div className="flex-1 space-y-6 overflow-y-auto py-6">
        {messages.length === 0 && (
          <div className="mx-auto mt-24 max-w-md text-center">
            <h2 className="font-display text-2xl font-semibold text-gray-200">
              Como posso ajudar hoje?
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Pergunte algo, peca para pesquisar na internet, ler um documento ou executar uma tarefa em etapas.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isSending && (
          <div className="px-4">
            {streamingContent ? (
              <MessageBubble
                message={{
                  id: 'streaming',
                  conversationId: '',
                  role: 'ASSISTANT',
                  content: streamingContent,
                  createdAt: new Date().toISOString(),
                }}
              />
            ) : (
              <p className="font-mono text-xs text-signal-400">Nexus AI esta pensando...</p>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-ink-800 p-4">
        <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 focus-within:border-nexus-500">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva sua mensagem..."
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="rounded-lg bg-nexus-600 p-2 text-white transition hover:bg-nexus-500 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
