import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

export function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email, password } : { name, email, password };
      const response = await apiClient.post(endpoint, payload);
      await setAuth(response.data.user, response.data.token, response.data.refreshToken);
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoBlock}>
        <View style={styles.logoIcon} />
        <Text style={styles.brand}>Nexus AI</Text>
        <Text style={styles.subtitle}>Seu assistente pessoal inteligente</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>

        {mode === 'register' && (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nome"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
          />
        )}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.text.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          placeholderTextColor={colors.text.muted}
          secureTextEntry
          style={styles.input}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text style={styles.switchText}>
            {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink[950], justifyContent: 'center', padding: 24 },
  logoBlock: { alignItems: 'center', marginBottom: 32 },
  logoIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.nexus[500], marginBottom: 12 },
  brand: { color: colors.text.primary, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.text.muted, fontSize: 13, marginTop: 4 },
  card: { backgroundColor: colors.ink[900], borderWidth: 1, borderColor: colors.ink[800], borderRadius: 16, padding: 20 },
  cardTitle: { color: colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 14 },
  input: {
    backgroundColor: colors.ink[800],
    borderWidth: 1,
    borderColor: colors.ink[700],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text.primary,
    fontSize: 15,
    marginBottom: 10,
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: 8 },
  button: {
    backgroundColor: colors.nexus[600],
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  switchText: { color: colors.text.muted, fontSize: 12, textAlign: 'center', marginTop: 14 },
});
