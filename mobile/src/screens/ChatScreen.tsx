import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
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
  const { token } = useAuthStore();

  const [conversationId, setConversationId] = useState<string | undefined>(
    route.params?.conversationId || undefined
  );
  const [historyVisible, setHistoryVisible] = useState(false);

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
});
