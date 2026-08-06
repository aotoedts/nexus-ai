import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

interface Stats { users: number; conversations: number; messages: number; documents: number; memories: number; }
interface AdminUser { id: string; name: string; email: string; role: 'USER' | 'ADMIN'; createdAt: string; }
interface AuditLogEntry { id: string; action: string; level: string; createdAt: string; }

export function Admin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    apiClient.get('/admin/stats').then((res) => setStats(res.data));
    apiClient.get('/admin/users').then((res) => setUsers(res.data.users));
    apiClient.get('/admin/logs').then((res) => setLogs(res.data.logs));
  }, []);

  return (
    <div className="min-h-screen bg-ink-950 p-6 text-gray-100">
      <h1 className="font-display text-2xl font-semibold mb-6">Painel administrativo</h1>

      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-ink-800 bg-ink-900 p-4">
              <p className="text-2xl font-semibold text-nexus-400">{value}</p>
              <p className="text-xs uppercase tracking-wide text-gray-500">{key}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-medium">Usuarios</h2>
          <div className="overflow-hidden rounded-xl border border-ink-800">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between border-b border-ink-800 bg-ink-900 px-4 py-3 last:border-0">
                <div>
                  <p className="text-sm text-gray-200">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <span className="rounded-full bg-ink-800 px-2 py-1 text-xs text-signal-400">{u.role}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-medium">Logs recentes</h2>
          <div className="overflow-hidden rounded-xl border border-ink-800">
            {logs.map((l) => (
              <div key={l.id} className="border-b border-ink-800 bg-ink-900 px-4 py-3 last:border-0">
                <p className="text-sm text-gray-300">{l.action}</p>
                <p className="text-xs text-gray-500">{new Date(l.createdAt).toLocaleString('pt-BR')} · {l.level}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
