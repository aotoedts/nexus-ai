import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setAuth: (user: User, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const KEYS = { user: 'nexus_user', token: 'nexus_token', refreshToken: 'nexus_refresh_token' };

/**
 * Estado global de autenticacao. O token fica no Keystore/Keychain
 * nativo (via expo-secure-store), criptografado pelo sistema
 * operacional - mais seguro que AsyncStorage puro para dados
 * sensiveis como tokens de sessao.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isHydrated: false,

  hydrate: async () => {
    const [userRaw, token, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(KEYS.user),
      SecureStore.getItemAsync(KEYS.token),
      SecureStore.getItemAsync(KEYS.refreshToken),
    ]);
    set({
      user: userRaw ? JSON.parse(userRaw) : null,
      token,
      refreshToken,
      isHydrated: true,
    });
  },

  setAuth: async (user, token, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.user, JSON.stringify(user)),
      SecureStore.setItemAsync(KEYS.token, token),
      refreshToken ? SecureStore.setItemAsync(KEYS.refreshToken, refreshToken) : Promise.resolve(),
    ]);
    set({ user, token, refreshToken: refreshToken ?? null });
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.user),
      SecureStore.deleteItemAsync(KEYS.token),
      SecureStore.deleteItemAsync(KEYS.refreshToken),
    ]);
    set({ user: null, token: null, refreshToken: null });
  },
}));
