import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccessibilityBridge } from '../native/AccessibilityBridge';
import { colors } from '../theme/colors';

export const AccessibilityControl: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const isEnabled = await AccessibilityBridge.isServiceEnabled();
      setEnabled(isEnabled);
    } catch (error) {
      console.error('Erro ao checar status de acessibilidade:', error);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkStatus();
      }
    });

    return () => subscription.remove();
  }, [checkStatus]);

  const handlePress = () => {
    if (!enabled) {
      AccessibilityBridge.openSettings();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <Ionicons
          name={enabled ? 'checkmark-circle' : 'alert-circle'}
          size={20}
          color={enabled ? colors.signal[400] : colors.text.muted}
        />
        <Text style={styles.statusText}>
          {checking
            ? 'Verificando...'
            : enabled
            ? 'Controle do dispositivo ativo'
            : 'Controle do dispositivo desativado'}
        </Text>
      </View>

      {!enabled && !checking && (
        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>Ativar nas Configurações</Text>
        </TouchableOpacity>
      )}

      {!enabled && !checking && (
        <Text style={styles.helperText}>
          Isso abre as Configurações de Acessibilidade do Android. Procure por
          "Copiloto AI" na lista e ative o serviço.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.ink[900],
    borderRadius: 12,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  button: {
    backgroundColor: colors.signal[400],
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink[950],
  },
  helperText: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 18,
  },
});
