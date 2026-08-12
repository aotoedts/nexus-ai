import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL as DEFAULT_API_URL, WS_URL as DEFAULT_WS_URL } from '../api/config';

interface SettingsState {
  apiUrl: string;
  wsUrl: string;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setUrls: (apiUrl: string, wsUrl: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

const KEYS = {
  apiUrl: 'nexus_settings_api_url',
  wsUrl: 'nexus_settings_ws_url',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  // Sempre começa usando os valores atuais do config.ts
  apiUrl: DEFAULT_API_URL,
  wsUrl: DEFAULT_WS_URL,
  isHydrated: false,

  hydrate: async () => {
    try {
      const [savedApiUrl, savedWsUrl] = await Promise.all([
        AsyncStorage.getItem(KEYS.apiUrl),
        AsyncStorage.getItem(KEYS.wsUrl),
      ]);

      // Se houver uma URL antiga salva, ela não será usada.
      // O app passa a usar a URL definida atualmente em config.ts.
      set({
        apiUrl: DEFAULT_API_URL,
        wsUrl: DEFAULT_WS_URL,
        isHydrated: true,
      });

      // Remove configurações antigas salvas no aparelho
      if (savedApiUrl || savedWsUrl) {
        await Promise.all([
          AsyncStorage.removeItem(KEYS.apiUrl),
          AsyncStorage.removeItem(KEYS.wsUrl),
        ]);
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações:', error);

      set({
        apiUrl: DEFAULT_API_URL,
        wsUrl: DEFAULT_WS_URL,
        isHydrated: true,
      });
    }
  },

  setUrls: async (apiUrl, wsUrl) => {
    await Promise.all([
      AsyncStorage.setItem(KEYS.apiUrl, apiUrl),
      AsyncStorage.setItem(KEYS.wsUrl, wsUrl),
    ]);

    set({
      apiUrl,
      wsUrl,
    });
  },

  resetToDefault: async () => {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.apiUrl),
      AsyncStorage.removeItem(KEYS.wsUrl),
    ]);

    set({
      apiUrl: DEFAULT_API_URL,
      wsUrl: DEFAULT_WS_URL,
    });
  },
}));