import React, { useState } from 'react';
import { View, TouchableOpacity, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';

interface Props {
  id: string;
  title: string;
  updatedAt: string;
  onPress: () => void;
  onDeleted: () => void;
  onRenamed: (newTitle: string) => void;
}

export function ConversationListItem({ id, title, updatedAt, onPress, onDeleted, onRenamed }: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [busy, setBusy] = useState(false);
  const date = new Date(updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const handleSaveEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === title) {
      setEditing(false);
      setEditValue(title);
      return;
    }
    setBusy(true);
    try {
      await apiClient.patch(`/conversations/${id}`, { title: trimmed });
      onRenamed(trimmed);
      setEditing(false);
    } catch (error) {
      console.error('Erro ao renomear conversa:', error);
      Alert.alert('Erro', 'Nao foi possivel renomear a conversa.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Apagar conversa', `Tem certeza que deseja apagar "${title}"? Essa acao nao pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await apiClient.delete(`/conversations/${id}`);
            onDeleted();
          } catch (error) {
            console.error('Erro ao apagar conversa:', error);
            Alert.alert('Erro', 'Nao foi possivel apagar a conversa.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (editing) {
    return (
      <View style={styles.container}>
        <Ionicons name="chatbubble-outline" size={18} color={colors.text.secondary} />
        <TextInput
          value={editValue}
          onChangeText={setEditValue}
          style={styles.editInput}
          autoFocus
          maxLength={100}
          editable={!busy}
          onSubmitEditing={handleSaveEdit}
        />
        <TouchableOpacity onPress={handleSaveEdit} disabled={busy} style={styles.iconButton}>
          <Ionicons name="checkmark" size={18} color={colors.signal[400]} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setEditing(false);
            setEditValue(title);
          }}
          disabled={busy}
          style={styles.iconButton}
        >
          <Ionicons name="close" size={18} color={colors.text.muted} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} disabled={busy}>
      <Ionicons name="chatbubble-outline" size={18} color={colors.text.secondary} />
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <TouchableOpacity onPress={() => setEditing(true)} disabled={busy} style={styles.iconButton}>
        <Ionicons name="pencil-outline" size={16} color={colors.text.muted} />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDelete} disabled={busy} style={styles.iconButton}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.ink[800] },
  textBlock: { flex: 1 },
  title: { color: colors.text.primary, fontSize: 15 },
  date: { color: colors.text.muted, fontSize: 12, marginTop: 2 },
  editInput: { flex: 1, color: colors.text.primary, fontSize: 15, borderBottomWidth: 1, borderBottomColor: colors.signal[400], paddingVertical: 2 },
  iconButton: { padding: 6 },
});
