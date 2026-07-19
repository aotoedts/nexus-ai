import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, MessageSquare, FileText, Brain } from 'lucide-react';
import { apiClient } from '../api/client.js';

interface Stats {
  users: number;
  conversations: number;
  messages: number;
  documents: number;
  memories: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

/** Painel administrativo: metricas gerais + gestao de usuarios. */
export function Admin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    apiClient.get('/admin/stats').then((res) => setStats(res.data));
    apiClient.get('/admin/users').then((res) => setUsers(res.data.users));
  }, []);

  const cards = stats
    ? [
        { label: 'Usuarios', value: stats.users, icon: Users },
        { label: 'Conversas', value: stats.conversations, icon: MessageSquare },
        { label: 'Documentos', value: stats.documents, icon: FileText },
        { label: 'Memorias', value: stats.memories, icon: Brain },
      ]
    : [];

  return (
    <div className="min-h-screen bg-ink-950 px-8 py-8">
      <Link to="/chat" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft size={14} /> Voltar ao chat
      </Link>

      <h1 className="mb-6 font-display text-2xl font-semibold text-gray-100">Painel administrativo</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-ink-700 bg-ink-900 p-4">
            <Icon size={18} className="mb-2 text-signal-400" />
            <p className="font-display text-2xl font-semibold text-gray-100">{value}</p>
            <p className="font-mono text-xs uppercase tracking-wider text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-ink-700 bg-ink-900">
        <div className="border-b border-ink-800 px-4 py-3">
          <h2 className="text-sm font-medium text-gray-300">Usuarios cadastrados</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="px-4 py-2 font-mono text-xs font-normal uppercase">Nome</th>
              <th className="px-4 py-2 font-mono text-xs font-normal uppercase">E-mail</th>
              <th className="px-4 py-2 font-mono text-xs font-normal uppercase">Papel</th>
              <th className="px-4 py-2 font-mono text-xs font-normal uppercase">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-ink-800 text-gray-300">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-gray-400">{u.email}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                      u.role === 'ADMIN' ? 'bg-nexus-600/30 text-nexus-100' : 'bg-ink-800 text-gray-400'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
