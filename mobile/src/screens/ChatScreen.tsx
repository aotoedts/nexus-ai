import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAgentRun } from '../hooks/useAgentRun';
import { AgentStatusPanel } from '../components/AgentStatusPanel';
import { AgentToggle } from '../components/AgentToggle';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInputBar } from '../components/ChatInputBar';
import { HistoryDrawer } from '../components/HistoryDrawer';

interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const ChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [conversationId, setConversationId] = useState<string | undefined>(
    route.params?.conversationId || ''
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  // Agent state
  const agentRunAPI = useAgentRun({
    token: user?.token || '',
    baseURL: 'https://nexus-backend-xu40.onrender.com',
    pollInterval: 2000,
  });

  const [agentEnabled, setAgentEnabled] = useState(false);
  const [agentObjective, setAgentObjective] = useState('');

  const listRef = useRef<FlatList>(null);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId || !user?.token) return;

    try {
      setIsLoadingHistory(true);
      const response = await fetch(
        `https://nexus-backend-xu40.onrender.com/api/v1/conversations/${conversationId}/messages`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [conversationId, user?.token]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Clear agent when changing conversation
  useEffect(() => {
    agentRunAPI.clearAgent();
    setAgentEnabled(false);
    setAgentObjective('');
  }, [conversationId, agentRunAPI]);

  // Send message
  const handleSend = useCallback(
    async (message: string) => {
      if (!conversationId || !user?.token || !message.trim()) return;

      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        conversationId,
        content: message,
        role: 'USER',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      try {
        const response = await fetch(
          'https://nexus-backend-xu40.onrender.com/api/v1/chat/send',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({
              conversationId,
              message,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.reply) {
            const assistantMessage: ChatMessage = {
              id: `msg_${Date.now() + 1}`,
              conversationId,
              content: data.reply,
              role: 'ASSISTANT',
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
          }
        }
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, user?.token]
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
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble message={item} />
    ),
    []
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 40}
        style={styles.flex}
      >
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.messagesList}
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
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
