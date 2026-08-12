import axios from 'axios';
import { API_URL } from './config';
import { useAuthStore } from '../store/authStore';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  adapter: 'fetch',
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  },
);