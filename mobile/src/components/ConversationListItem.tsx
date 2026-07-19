import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  title: string;
  updatedAt: string;
  onPress: () => void;
}

export function ConversationListItem({ title, updatedAt, onPress }: Props) {
  const date = new Date(updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Ionicons name="chatbubble-outline" size={18} color={colors.text.secondary} />
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.date}>{date}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink[800],
  },
  title: { flex: 1, color: colors.text.primary, fontSize: 15 },
  date: { color: colors.text.muted, fontSize: 12 },
});
