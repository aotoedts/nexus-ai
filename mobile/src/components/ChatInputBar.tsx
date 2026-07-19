import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Escreva sua mensagem..."
        placeholderTextColor={colors.text.muted}
        style={styles.input}
        multiline
        editable={!disabled}
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={!value.trim() || disabled}
        style={[styles.sendButton, (!value.trim() || disabled) && styles.sendButtonDisabled]}
      >
        <Ionicons name="send" size={17} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.ink[800],
    backgroundColor: colors.ink[950],
    padding: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.ink[900],
    borderWidth: 1,
    borderColor: colors.ink[700],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text.primary,
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: colors.nexus[600],
    borderRadius: 12,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
});
