import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.nexus.app',
  appName: 'Nexus AI',
  webDir: 'dist',
  server: { androidScheme: 'https', iosScheme: 'https' },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 800, backgroundColor: '#0a0a12', androidSplashResourceName: 'splash', showSpinner: false },
    StatusBar: { style: 'DARK', backgroundColor: '#0a0a12' },
  },
};

export default config;
