import { Plus, MessageSquare, Shield, LogOut } from 'lucide-react';
import { Conversation } from '../types/index.js';
import { useAuthStore } from '../store/authStore.js';
import { Link, useNavigate } from 'react-router-dom';

interface Props {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function Sidebar({ conversations, activeId, onSelect, onNew }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-ink-800 bg-ink-900">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-nexus-400 to-signal-400" />
        <span className="font-display text-lg font-semibold tracking-tight">Nexus AI</span>
      </div>

      <button
        onClick={onNew}
        className="mx-4 mb-4 flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-2.5 text-sm text-gray-200 transition hover:border-nexus-500 hover:bg-ink-800"
      >
        <Plus size={16} /> Nova conversa
      </button>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex w-full items-center gap-2 truncate rounded-lg px-3 py-2 text-left text-sm transition ${
              c.id === activeId ? 'bg-ink-800 text-white' : 'text-gray-400 hover:bg-ink-800/60 hover:text-gray-200'
            }`}
          >
            <MessageSquare size={14} className="shrink-0" />
            <span className="truncate">{c.title}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-ink-800 p-3">
        {user?.role === 'ADMIN' && (
          <Link
            to="/admin"
            className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition hover:bg-ink-800 hover:text-gray-200"
          >
            <Shield size={14} /> Painel administrativo
          </Link>
        )}
        <div className="flex items-center justify-between rounded-lg px-3 py-2">
          <span className="truncate text-sm text-gray-300">{user?.name}</span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-gray-500 transition hover:text-red-400"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
