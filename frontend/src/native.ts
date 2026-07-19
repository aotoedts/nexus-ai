import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Ajustes especificos para quando o Nexus AI roda dentro do app nativo
 * (Android/iOS via Capacitor), em vez do navegador. Chamado uma unica
 * vez na inicializacao (main.tsx). No navegador/PWA, isNativePlatform()
 * retorna false e nada aqui e executado.
 */
export async function bootstrapNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a12' });
  } catch {
    // Ignora silenciosamente em plataformas sem StatusBar (ex: iOS pode restringir cor de fundo)
  }

  await SplashScreen.hide();
}
