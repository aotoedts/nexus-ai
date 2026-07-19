import { create } from 'zustand';
import { User } from '../types/index.js';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

/** Estado global de autenticacao, persistido em localStorage. */
export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('nexus_user') ?? 'null'),
  token: localStorage.getItem('nexus_token'),

  setAuth: (user, token) => {
    localStorage.setItem('nexus_user', JSON.stringify(user));
    localStorage.setItem('nexus_token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_token');
    set({ user: null, token: null });
  },
}));
