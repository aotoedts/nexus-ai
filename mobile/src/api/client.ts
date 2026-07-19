import axios from 'axios';
import { API_URL } from './config';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Cliente HTTP central do app. O baseURL e resolvido a cada requisicao
 * a partir do settingsStore (que comeca com o valor padrao de
 * app.json, mas pode ser sobrescrito pelo usuario na tela de
 * Configuracoes) - assim uma mudanca de URL vale imediatamente, sem
 * precisar reiniciar o app.
 */
export const apiClient = axios.create({ baseURL: API_URL, timeout: 20000 });

apiClient.interceptors.request.use((config) => {
  config.baseURL = useSettingsStore.getState().apiUrl;
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
