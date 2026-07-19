import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { ChatMessage } from '../hooks/useChat';

interface Props {
  message: ChatMessage;
}

/** Bolha de mensagem individual - mesma metafora visual do "fio sinaptico" do app web. */
export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'USER';
  const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && <View style={styles.dot} />}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={styles.text}>{message.content}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 12, marginVertical: 6, alignItems: 'flex-end' },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.signal[400],
    marginRight: 8,
    marginBottom: 14,
  },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: colors.nexus[600], borderTopRightRadius: 4 },
  bubbleAssistant: { backgroundColor: colors.ink[800], borderTopLeftRadius: 4, borderWidth: 1, borderColor: colors.ink[700] },
  text: { color: colors.text.primary, fontSize: 15, lineHeight: 21 },
  time: { color: colors.text.muted, fontSize: 10, marginTop: 6, textTransform: 'uppercase' },
});
