import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuracao do Capacitor: empacota o build web (frontend/dist) do
 * Nexus AI em um app nativo Android/iOS. O app roda o mesmo React que
 * roda no navegador, dentro de uma WebView nativa, e se comunica com o
 * backend via HTTPS/WSS normalmente (mesma API REST + WebSocket).
 *
 * IMPORTANTE: dentro do app nativo nao existe "localhost" do seu
 * computador/servidor de dev. VITE_API_URL e VITE_WS_URL usados no
 * build precisam apontar para o backend publicado (ex: Render), com
 * https:// e wss://. Configure isso em frontend/.env.production antes
 * de rodar `npm run cap:sync`.
 */
const config: CapacitorConfig = {
  appId: 'ai.nexus.app',
  appName: 'Nexus AI',
  webDir: 'dist',
  server: {
    // 'https' evita problemas de mixed-content e cookies em Android/iOS.
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0a0a12',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a12',
    },
  },
};

export default config;
