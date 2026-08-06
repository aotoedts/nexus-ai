import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

export function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { apiUrl, wsUrl, setUrls, resetToDefault } = useSettingsStore();
  const [editApiUrl, setEditApiUrl] = useState(apiUrl);
  const [editWsUrl, setEditWsUrl] = useState(wsUrl);
  const [editing, setEditing] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleSave = async () => {
    await setUrls(editApiUrl.trim(), editWsUrl.trim());
    setEditing(false);
    Alert.alert('Salvo', 'O app vai usar o novo servidor a partir de agora.');
  };

  const handleReset = () => {
    Alert.alert('Restaurar padrão', 'Voltar para o servidor padrão do app?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Restaurar',
        style: 'destructive',
        onPress: async () => {
          await resetToDefault();
          setEditApiUrl(apiUrl);
          setEditWsUrl(wsUrl);
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CONTA</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="person-circle-outline" size={30} color={colors.nexus[400]} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>SERVIDOR</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editLink}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.card}>
          {editing ? (
            <>
              <Text style={styles.fieldLabel}>URL da API</Text>
              <TextInput
                value={editApiUrl}
                onChangeText={setEditApiUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="https://sua-api.onrender.com/api/v1"
                placeholderTextColor={colors.text.muted}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>URL do WebSocket</Text>
              <TextInput
                value={editWsUrl}
                onChangeText={setEditWsUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="wss://sua-api.onrender.com/api/v1/ws"
                placeholderTextColor={colors.text.muted}
                style={styles.input}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditing(false)}>
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
                  <Text style={styles.primaryButtonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>URL da API</Text>
              <Text style={styles.readOnlyValue}>{apiUrl}</Text>
              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>URL do WebSocket</Text>
              <Text style={styles.readOnlyValue}>{wsUrl}</Text>
            </>
          )}
        </View>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetLink}>Restaurar servidor padrão</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Nexus AI · v{appVersion}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink[950] },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  editLink: { color: colors.nexus[400], fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: colors.ink[900],
    borderWidth: 1,
    borderColor: colors.ink[800],
    borderRadius: 14,
    padding: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  userName: { color: colors.text.primary, fontSize: 15, fontWeight: '600' },
  userEmail: { color: colors.text.muted, fontSize: 12, marginTop: 2 },
  fieldLabel: { color: colors.text.secondary, fontSize: 11, marginBottom: 4 },
  readOnlyValue: { color: colors.text.primary, fontSize: 13 },
  input: {
    backgroundColor: colors.ink[800],
    borderWidth: 1,
    borderColor: colors.ink[700],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text.primary,
    fontSize: 13,
    marginBottom: 10,
  },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.nexus[600],
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.ink[800],
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
  resetLink: { color: colors.text.muted, fontSize: 12, marginTop: 8, textAlign: 'center' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  version: { color: colors.text.muted, fontSize: 11, textAlign: 'center', marginTop: 24 },
});
