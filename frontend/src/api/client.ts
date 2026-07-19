import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api/v1';

/** Cliente HTTP central da aplicacao, com injecao automatica do token JWT. */
export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
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
