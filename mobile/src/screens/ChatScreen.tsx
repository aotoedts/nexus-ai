import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TouchableOpacity, Modal, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useChat } from '../hooks/useChat';
import { useAgentRun } from '../hooks/useAgentRun';
import { AgentStatusPanel } from '../components/AgentStatusPanel';
import { AgentToggle } from '../components/AgentToggle';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInputBar } from '../components/ChatInputBar';
import { HistoryDrawer } from '../components/HistoryDrawer';
import { colors } from '../theme/colors';

export const ChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { token, logout } = useAuthStore();

  const [conversationId, setConversationId] = useState<string | undefined>(
    route.params?.conversationId || undefined
  );
  const [historyVisible, setHistoryVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setProfileMenuVisible(true)}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Ionicons name="person-circle-outline" size={26} color={colors.text.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const { messages, isSending, isLoadingHistory, sendMessage } = useChat(conversationId);

  // Agent state
  const agentRunAPI = useAgentRun({
    token: token || '',
    baseURL: 'https://nexus-backend-xu40.onrender.com',
    pollInterval: 2000,
  });

  const [agentEnabled, setAgentEnabled] = useState(false);
  const [agentObjective, setAgentObjective] = useState('');

  const listRef = useRef<FlatList>(null);

  // Clear agent when changing conversation
  useEffect(() => {
    agentRunAPI.clearAgent();
    setAgentEnabled(false);
    setAgentObjective('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleSend = useCallback(
    async (message: string) => {
      const newConversationId = await sendMessage(message, conversationId);
      if (!conversationId && newConversationId) {
        setConversationId(newConversationId);
      }
    },
    [conversationId, sendMessage]
  );

  // Agent handlers
  const handleAgentToggle = useCallback(
    async (enabled: boolean, objective?: string) => {
      if (enabled && objective && conversationId) {
        try {
          setAgentObjective(objective);
          await agentRunAPI.startAgent(conversationId, objective);
          setAgentEnabled(true);
        } catch (error) {
          console.error('Erro ao iniciar agente:', error);
        }
      } else {
        setAgentEnabled(false);
      }
    },
    [conversationId, agentRunAPI]
  );

  const handleAgentCancel = useCallback(async () => {
    if (agentRunAPI.agentRun?.id) {
      try {
        await agentRunAPI.cancelAgent(agentRunAPI.agentRun.id);
        setAgentEnabled(false);
        setAgentObjective('');
      } catch (error) {
        console.error('Erro ao cancelar agente:', error);
      }
    }
  }, [agentRunAPI]);

  const handleAuthorizeStep = useCallback(async () => {
    if (agentRunAPI.agentRun?.id && agentRunAPI.agentRun.pendingAuthorization) {
      try {
        await agentRunAPI.authorizeStep(
          agentRunAPI.agentRun.id,
          agentRunAPI.agentRun.pendingAuthorization.stepId,
          true
        );
      } catch (error) {
        console.error('Erro ao autorizar:', error);
      }
    }
  }, [agentRunAPI]);

  const handleDenyStep = useCallback(async () => {
    if (agentRunAPI.agentRun?.id && agentRunAPI.agentRun.pendingAuthorization) {
      try {
        await agentRunAPI.authorizeStep(
          agentRunAPI.agentRun.id,
          agentRunAPI.agentRun.pendingAuthorization.stepId,
          false
        );
        setAgentEnabled(false);
      } catch (error) {
        console.error('Erro ao recusar:', error);
      }
    }
  }, [agentRunAPI]);

  const renderMessage = useCallback(
    ({ item }: { item: (typeof messages)[number] }) => <MessageBubble message={item} />,
    []
  );

  return (
    <View style={styles.container}>
      <Modal visible={profileMenuVisible} transparent animationType="fade" onRequestClose={() => setProfileMenuVisible(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setProfileMenuVisible(false)}>
          <View style={styles.menuPanel}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setProfileMenuVisible(false);
                setHistoryVisible(true);
              }}
            >
              <Ionicons name="time-outline" size={18} color={colors.text.primary} />
              <Text style={styles.menuItemText}>Histórico</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setProfileMenuVisible(false);
                logout();
              }}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Sair</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.flex}
      >
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.messagesList}
          style={styles.flex}
        />

        {agentRunAPI.agentRun && (
          <AgentStatusPanel
            agentRun={agentRunAPI.agentRun}
            isLoading={agentRunAPI.isLoading}
            onAuthorize={handleAuthorizeStep}
            onDeny={handleDenyStep}
            onCancel={handleAgentCancel}
          />
        )}

        <ChatInputBar
          onSend={handleSend}
          disabled={isSending}
          agentButton={
            <AgentToggle
              enabled={agentEnabled}
              isAgentActive={agentRunAPI.agentRun?.status === 'running'}
              isLoading={agentRunAPI.isLoading}
              onToggle={handleAgentToggle}
              onCancel={handleAgentCancel}
            />
          }
        />
      </KeyboardAvoidingView>

      <HistoryDrawer
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        onNewConversation={() => {
          setConversationId(undefined);
          setHistoryVisible(false);
        }}
        onSelectConversation={(id) => {
          setConversationId(id);
          setHistoryVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink[950],
  },
  flex: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
  },
  menuPanel: {
    marginTop: 60,
    marginRight: 12,
    backgroundColor: colors.ink[900],
    borderWidth: 1,
    borderColor: colors.ink[800],
    borderRadius: 12,
    minWidth: 180,
    paddingVertical: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.ink[800],
  },
});
