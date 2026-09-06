import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from './theme/colors';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { RootNavigator } from './navigation/RootNavigator';
import { ErrorBoundary } from './components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT (${ms}ms) em: ${label}`)), ms)
    ),
  ]);
}

export default function App() {
  const [status, setStatus] = useState('Iniciando...');
  const [isReady, setIsReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    // Esconde a splash nativa IMEDIATAMENTE, sem esperar nada.
    // A partir daqui, quem controla a tela e' o React.
    SplashScreen.hideAsync().catch(() => {});

    (async () => {
      try {
        setStatus('Hidratando auth...');
        await withTimeout(hydrateAuth(), 5000, 'hydrateAuth');

        setStatus('Hidratando settings...');
        await withTimeout(hydrateSettings(), 5000, 'hydrateSettings');

        setStatus('Pronto!');
        setIsReady(true);
      } catch (err: any) {
        setBootError(`${err?.message ?? 'Erro desconhecido'}\n\n${(err?.stack ?? '').toString().slice(0, 800)}`);
      }
    })();
  }, [hydrateAuth, hydrateSettings]);

  if (bootError) {
    return (
      <ScrollView style={styles.errorScreen} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
        <Text style={styles.errorTitle}>Erro na inicialização:</Text>
        <Text style={styles.errorText}>{bootError}</Text>
      </ScrollView>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.nexus[400]} />
        <Text style={styles.statusText}>{status}</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <SafeAreaProvider style={styles.flex}>
        <StatusBar style="light" backgroundColor={colors.ink[950]} />
        <ErrorBoundary><RootNavigator /></ErrorBoundary>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink[950] },
  statusText: { color: '#ffffff', marginTop: 16, fontSize: 14 },
  errorScreen: { flex: 1, backgroundColor: '#1a0000' },
  errorTitle: { color: '#ff6b6b', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  errorText: { color: '#ffffff', fontSize: 12, fontFamily: 'monospace' },
});
