import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSettings: () => void;
}

export function ProfileMenu({ visible, onClose, onSettings }: Props) {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    onClose();
    Alert.alert('Sair', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.menu}>
          <View style={styles.userRow}>
            <Ionicons name="person-circle-outline" size={28} color={colors.nexus[400]} />
            <View style={{ marginLeft: 8, flexShrink: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.item} onPress={onSettings}>
            <Ionicons name="settings-outline" size={18} color={colors.text.primary} />
            <Text style={styles.itemText}>Configurações</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={[styles.itemText, { color: colors.danger }]}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'flex-end' },
  menu: { marginTop: 52, marginRight: 12, width: 220, backgroundColor: colors.ink[900], borderWidth: 1, borderColor: colors.ink[800], borderRadius: 14, paddingVertical: 8, elevation: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  userName: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },
  userEmail: { color: colors.text.muted, fontSize: 11, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.ink[800], marginVertical: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  itemText: { color: colors.text.primary, fontSize: 14 },
});
