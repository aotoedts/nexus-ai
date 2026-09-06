import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'USER' | 'ADMIN';
}

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  setAuth: (user: User, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const KEYS = {
  user: 'nexus_auth_user',
  token: 'nexus_auth_token',
  refreshToken: 'nexus_auth_refresh_token',
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  refreshToken: null,

  setAuth: async (user, token, refreshToken) => {
    set({ user, token, refreshToken: refreshToken ?? null });
    try {
      await Promise.all([
        AsyncStorage.setItem(KEYS.user, JSON.stringify(user)),
        AsyncStorage.setItem(KEYS.token, token),
        refreshToken
          ? AsyncStorage.setItem(KEYS.refreshToken, refreshToken)
          : AsyncStorage.removeItem(KEYS.refreshToken),
      ]);
    } catch (error) {
      console.warn('Erro ao salvar auth:', error);
    }
  },

  logout: async () => {
    set({ user: null, token: null, refreshToken: null });
    try {
      await Promise.all([
        AsyncStorage.removeItem(KEYS.user),
        AsyncStorage.removeItem(KEYS.token),
        AsyncStorage.removeItem(KEYS.refreshToken),
      ]);
    } catch (error) {
      console.warn('Erro ao limpar auth:', error);
    }
  },

  hydrate: async () => {
    try {
      const [storedUser, storedToken, storedRefreshToken] = await Promise.all([
        AsyncStorage.getItem(KEYS.user),
        AsyncStorage.getItem(KEYS.token),
        AsyncStorage.getItem(KEYS.refreshToken),
      ]);
      if (storedUser && storedToken) {
        set({
          user: JSON.parse(storedUser),
          token: storedToken,
          refreshToken: storedRefreshToken,
        });
      }
    } catch (error) {
      console.warn('Erro ao hidratar auth:', error);
    }
  },
}));
