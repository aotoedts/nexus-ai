import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';
import { ConversationListItem } from './ConversationListItem';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function HistoryDrawer({ visible, onClose, onSelectConversation, onNewConversation }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/conversations');
      setConversations(data.conversations);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Histórico</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.newButton} onPress={onNewConversation}>
            <Ionicons name="add-circle-outline" size={18} color={colors.nexus[400]} />
            <Text style={styles.newButtonText}>Nova conversa</Text>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.nexus[400]} />
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>Nenhuma conversa ainda.</Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ConversationListItem
                  title={item.title}
                  updatedAt={item.updatedAt}
                  onPress={() => onSelectConversation(item.id)}
                />
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  panel: { width: '78%', height: '100%', backgroundColor: colors.ink[950], borderRightWidth: 1, borderRightColor: colors.ink[800], paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.ink[800] },
  headerTitle: { color: colors.text.primary, fontSize: 17, fontWeight: '700' },
  newButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  newButtonText: { color: colors.nexus[400], fontSize: 14, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.text.muted, fontSize: 13 },
});
