import { Message } from '../types/index.js';

interface Props {
  message: Message;
}

/**
 * Bolha de mensagem individual. O elemento de assinatura do Nexus AI eh
 * o "fio sinaptico": uma linha vertical continua que atravessa toda a
 * thread, com um no pulsante ao lado de cada mensagem do assistente -
 * uma metafora visual para a memoria/raciocinio continuo do agente.
 */
export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'USER';

  return (
    <div className={`relative flex gap-3 px-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="relative flex flex-col items-center pt-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-signal-400 shadow-[0_0_10px_2px_rgba(78,230,196,0.5)]" />
          <span className="mt-1 w-px flex-1 bg-ink-700" />
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
          isUser
            ? 'bg-nexus-600 text-white rounded-tr-sm'
            : 'bg-ink-800 text-gray-100 rounded-tl-sm border border-ink-700'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-wider text-gray-400/70">
          {message.createdAt   ? new Date(message.createdAt).toLocaleTimeString('pt-BR', {       hour: '2-digit',       minute: '2-digit',     })   : ''}
        </span>
      </div>
    </div>
  );
}
