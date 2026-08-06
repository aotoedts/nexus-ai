import React, { useCallback, useState } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';
import { ConversationListItem } from '../components/ConversationListItem';
import { RootStackParamList } from '../navigation/RootNavigator';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Conversations'>;

/** Tela de historico: lista as conversas do usuario, mais recentes primeiro. */
export function ConversationsScreen() {
  const navigation = useNavigation<NavProp>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/conversations');
      setConversations(data.conversations);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recarrega sempre que a tela ganha foco (ex: apos criar uma conversa nova).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.nexus[400]} />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Nenhuma conversa ainda.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={conversations}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.nexus[400]}
        />
      }
      renderItem={({ item }) => (
        <ConversationListItem
          title={item.title}
          updatedAt={item.updatedAt}
          onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink[950] },
  center: { flex: 1, backgroundColor: colors.ink[950], alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.text.muted, fontSize: 14 },
});
