import Constants from 'expo-constants';

/**
 * Le a URL do backend a partir de app.json (campo "extra"), definida em
 * tempo de build. Isso evita hardcode espalhado pelo codigo e permite
 * trocar de ambiente (staging/producao) sem mexer em nenhum arquivo .ts.
 */
const extra = Constants.expoConfig?.extra ?? {};

export const API_URL: string = extra.apiUrl ?? 'http://localhost:3333/api/v1';
export const WS_URL: string = extra.wsUrl ?? 'ws://localhost:3333/api/v1/ws';
