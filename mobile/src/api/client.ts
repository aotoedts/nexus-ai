import axios from 'axios';
import { API_URL } from './config';
import { useAuthStore } from '../store/authStore';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

// Instancia separada, sem interceptors, usada so pra chamar /auth/refresh.
// Evita que o token expirado seja anexado a essa chamada e evita loop de interceptor.
const refreshClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  // Usa sempre a URL definida em config.ts
  config.baseURL = API_URL;

  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Garante que, se varias requisicoes derem 401 ao mesmo tempo, so uma
// chamada de refresh e feita (o refresh token e rotacionado no backend,
// entao chamadas concorrentes com o mesmo refresh token antigo falhariam).
let refreshPromise: Promise<string | null> | null = null;

async function refreshAuthToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const currentRefreshToken = useAuthStore.getState().refreshToken;
    if (!currentRefreshToken) {
      return null;
    }

    try {
      const { data } = await refreshClient.post('/auth/refresh', {
        refreshToken: currentRefreshToken,
      });

      const user = useAuthStore.getState().user;
      if (!user) {
        return null;
      }

      await useAuthStore.getState().setAuth(user, data.token, data.refreshToken);
      return data.token as string;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const newToken = await refreshAuthToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      await useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  },
);
