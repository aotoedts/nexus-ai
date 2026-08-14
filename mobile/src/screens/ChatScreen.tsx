import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useChat, ChatMessage } from '../hooks/useChat';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInputBar } from '../components/ChatInputBar';
import { HistoryDrawer } from '../components/HistoryDrawer';
import { ProfileMenu } from '../components/ProfileMenu';
import { apiClient } from '../api/client';
import { RootStackParamList } from '../navigation/RootNavigator';

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatNavProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

/**
 * Tela principal de chat. Recebe opcionalmente um conversationId via
 * navegacao (quando o usuario abre uma conversa do historico); sem
 * parametro, comeca uma conversa nova.
 */
export function ChatScreen() {
  const navigation = useNavigation<ChatNavProp>();
  const route = useRoute<ChatRouteProp>();
  const [conversationId, setConversationId] = useState<string | undefined>(
    route.params?.conversationId,
  );
  const [historyVisible, setHistoryVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const { messages, isSending, streamingContent, isLoadingHistory, sendMessage } =
    useChat(conversationId);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    setConversationId(route.params?.conversationId);
  }, [route.params?.conversationId]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => setHistoryVisible(true)} style={{ marginLeft: 12 }}>
          <Ionicons name="menu-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={() => setProfileMenuVisible(true)} style={{ marginRight: 12 }}>
          <Ionicons name="person-circle-outline" size={26} color={colors.text.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, streamingContent]);

  const handleSend = async (content: string, images?: string[], files?: unknown[]) => {
    const newConversationId = await sendMessage(content, conversationId, images, files);
    if (!conversationId && newConversationId) {
      setConversationId(newConversationId);
      // Renomeia a conversa com base na primeira mensagem, sem bloquear a UI.
      apiClient
        .patch(`/conversations/${newConversationId}`, { title: content.slice(0, 60) })
        .catch(() => {});
    }
  };

  return (
    <>
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {messages.length === 0 && !isLoadingHistory ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Como posso ajudar hoje?</Text>
          <Text style={styles.emptySubtitle}>
            Pergunte algo, peça para pesquisar na internet, ler um documento ou executar uma
            tarefa em etapas.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {isSending && (
        <Text style={styles.thinking}>
          {streamingContent ? streamingContent : 'Nexus AI está pensando...'}
        </Text>
      )}

      <ChatInputBar onSend={handleSend} disabled={isSending} />
    </KeyboardAvoidingView>
    <HistoryDrawer
      visible={historyVisible}
      onClose={() => setHistoryVisible(false)}
      onSelectConversation={(id) => {
        setConversationId(id);
        navigation.setParams({ conversationId: id });
        setHistoryVisible(false);
      }}
      onNewConversation={() => {
        setConversationId(undefined);
        navigation.setParams({ conversationId: undefined });
        setHistoryVisible(false);
      }}
    />
    <ProfileMenu
      visible={profileMenuVisible}
      onClose={() => setProfileMenuVisible(false)}
      onSettings={() => {
        setProfileMenuVisible(false);
        navigation.navigate('Settings');
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink[950] },
  list: { paddingVertical: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { color: colors.text.primary, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: {
    color: colors.text.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  thinking: {
    color: colors.signal[400],
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
});
