import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';

/**
 * Tela de autenticacao. Alterna entre login e cadastro no mesmo
 * formulario para manter o fluxo simples e direto.
 */
export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email, password } : { name, email, password };
      const response = await apiClient.post(endpoint, payload);
      setAuth(response.data.user, response.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 h-10 w-10 rounded-lg bg-gradient-to-br from-nexus-400 to-signal-400" />
          <h1 className="font-display text-2xl font-semibold text-gray-100">Nexus AI</h1>
          <p className="mt-1 text-sm text-gray-500">Seu assistente pessoal inteligente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-ink-800 bg-ink-900 p-6">
          <h2 className="mb-2 font-display text-lg font-medium text-gray-200">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </h2>

          {mode === 'register' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
              required
              className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-nexus-500 focus:outline-none"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-nexus-500 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            required
            minLength={6}
            className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-nexus-500 focus:outline-none"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-nexus-600 py-2.5 text-sm font-medium text-white transition hover:bg-nexus-500 disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-300"
          >
            {mode === 'login' ? 'Nao tem conta? Cadastre-se' : 'Ja tem conta? Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
