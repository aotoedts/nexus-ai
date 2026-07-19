import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from './src/theme/colors';
import { useAuthStore } from './src/store/authStore';
import { useSettingsStore } from './src/store/settingsStore';
import { RootNavigator } from './src/navigation/RootNavigator';

// Mantem a splash nativa visivel ate os stores serem hidratados
// (sessao salva no Keystore/Keychain + configuracoes de servidor).
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    (async () => {
      await Promise.all([hydrateAuth(), hydrateSettings()]);
      setIsReady(true);
    })();
  }, [hydrateAuth, hydrateSettings]);

  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      await SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.nexus[400]} />
      </View>
    );
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView} style={styles.flex}>
      <StatusBar style="light" backgroundColor={colors.ink[950]} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink[950] },
});
