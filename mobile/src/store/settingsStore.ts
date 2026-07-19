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

const KEYS = { apiUrl: 'nexus_settings_api_url', wsUrl: 'nexus_settings_ws_url' };

/**
 * Permite trocar o backend em tempo de execucao (ex: apontar para um
 * ambiente de staging, ou para uma instancia self-hosted diferente),
 * sem precisar gerar um novo build do app. Guardado em AsyncStorage
 * (nao e dado sensivel, ao contrario do token de autenticacao).
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  apiUrl: DEFAULT_API_URL,
  wsUrl: DEFAULT_WS_URL,
  isHydrated: false,

  hydrate: async () => {
    const [apiUrl, wsUrl] = await Promise.all([
      AsyncStorage.getItem(KEYS.apiUrl),
      AsyncStorage.getItem(KEYS.wsUrl),
    ]);
    set({
      apiUrl: apiUrl ?? DEFAULT_API_URL,
      wsUrl: wsUrl ?? DEFAULT_WS_URL,
      isHydrated: true,
    });
  },

  setUrls: async (apiUrl, wsUrl) => {
    await Promise.all([
      AsyncStorage.setItem(KEYS.apiUrl, apiUrl),
      AsyncStorage.setItem(KEYS.wsUrl, wsUrl),
    ]);
    set({ apiUrl, wsUrl });
  },

  resetToDefault: async () => {
    await Promise.all([AsyncStorage.removeItem(KEYS.apiUrl), AsyncStorage.removeItem(KEYS.wsUrl)]);
    set({ apiUrl: DEFAULT_API_URL, wsUrl: DEFAULT_WS_URL });
  },
}));
