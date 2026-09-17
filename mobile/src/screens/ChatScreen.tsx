import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  Animated,
  Platform,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TouchableOpacity, Modal, Pressable, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useChat } from '../hooks/useChat';
import { useAgentRun } from '../hooks/useAgentRun';
import { apiClient } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityBridge } from '../native/AccessibilityBridge';
import { AgentStatusPanel } from '../components/AgentStatusPanel';
import { AgentToggle } from '../components/AgentToggle';
import { MessageBubble } from '../components/MessageBubble';
import { KeyboardStickyView, useKeyboardAnimation } from 'react-native-keyboard-controller';
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
  const keyboardAnim = useKeyboardAnimation();

  // Clear agent when changing conversation
  useEffect(() => {
    agentRunAPI.clearAgent();
    setAgentEnabled(false);
    setAgentObjective('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleSend = useCallback(
    async (message: string) => {
      try {
        const newConversationId = await sendMessage(message, conversationId);
        if (!conversationId && newConversationId) {
          setConversationId(newConversationId);
        }
      } catch (error: any) {
        console.error('Erro ao enviar mensagem:', error);
        Alert.alert(
          'Erro ao enviar mensagem',
          error?.message || error?.response?.data?.message || 'Falha desconhecida ao conectar com o servidor.'
        );
      }
    },
    [conversationId, sendMessage]
  );

  // Agent handlers
  const handleAgentToggle = useCallback(
    async (enabled: boolean, objective?: string) => {
      if (objective) {
        try {
          let activeConversationId = conversationId;

          if (!activeConversationId) {
            const response = await apiClient.post('/conversations', {});
            activeConversationId = response.data.conversation.id;
            setConversationId(activeConversationId);
          }

          setAgentObjective(objective);
          await apiClient.patch('/agents/status', { agentEnabled: true });
          const startedRun = await agentRunAPI.startAgent(activeConversationId as string, objective);
          await AsyncStorage.setItem(`agent-run:${activeConversationId}`, startedRun.id);
          setAgentEnabled(true);
        } catch (error: any) {
          console.error('Erro ao iniciar agente:', error);
          Alert.alert(
            'Erro ao iniciar agente',
            error?.message || error?.response?.data?.message || 'Falha desconhecida ao iniciar o agente.'
          );
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

  // Execucao automatica de acoes no dispositivo quando o agente pausa
  // aguardando controle do celular (toque, leitura de tela, pergunta).
  const processedDeviceAction = useRef<string | null>(null);

  useEffect(() => {
    const run = agentRunAPI.agentRun;
    if (!run || run.status !== 'awaiting_device_action' || !run.pendingAuthorization) return;

    const actionKey = `${run.id}:${run.steps.length}`;
    if (processedDeviceAction.current === actionKey) return;

    const { action, details } = run.pendingAuthorization;

    if (action === 'ask_user_question') {
      processedDeviceAction.current = actionKey;
      return;
    }

    const runDeviceAction = async () => {
      processedDeviceAction.current = actionKey;
      try {
        let resultData: unknown;
        switch (action) {
          case 'device_dump_screen':
            resultData = await AccessibilityBridge.dumpScreen();
            break;
          case 'device_tap':
            resultData = await AccessibilityBridge.tap(Number(details?.x ?? 0), Number(details?.y ?? 0));
            break;
          case 'device_go_home':
            resultData = await AccessibilityBridge.goHome();
            break;
          case 'device_go_back':
            resultData = await AccessibilityBridge.goBack();
            break;
          case 'device_open_app':
            resultData = await AccessibilityBridge.openApp(String(details?.appName ?? ''));
            break;
          case 'device_type_text':
            resultData = await AccessibilityBridge.typeText(String(details?.text ?? ''));
            break;
          default:
            resultData = { error: `Acao desconhecida: ${action}` };
        }
        await agentRunAPI.submitDeviceResult(run.id, resultData);
      } catch (error: any) {
        console.error('Erro ao executar acao no dispositivo:', error);
        Alert.alert(
          'Erro ao controlar o dispositivo',
          error?.message || 'Ative o Copiloto AI nas Configuracoes de Acessibilidade do Android.'
        );
      }
    };

    runDeviceAction();
  }, [agentRunAPI.agentRun]);

  const handleAnswerQuestion = useCallback(async (answer: string) => {
    const run = agentRunAPI.agentRun;
    if (!run || !answer.trim()) return;
    try {
      await agentRunAPI.submitDeviceResult(run.id, { answer: answer.trim() });
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
    }
  }, [agentRunAPI]);

  // Restaura uma execucao ativa do agente ao reabrir a conversa (persistencia
  // entre sessoes do app).
  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      const key = `agent-run:${conversationId}`;
      try {
        const storedRunId = await AsyncStorage.getItem(key);
        if (!storedRunId) return;
        const run = await agentRunAPI.restoreRun(storedRunId);
        if (['planning', 'running'].includes(run.status)) {
          setAgentEnabled(true);
        }
        if (['completed', 'error', 'cancelled'].includes(run.status)) {
          await AsyncStorage.removeItem(key);
        }
      } catch {
        await AsyncStorage.removeItem(key).catch(() => {});
      }
    })();
  }, [conversationId]);

  // Limpa a execucao salva quando ela chega a um estado final.
  useEffect(() => {
    const run = agentRunAPI.agentRun;
    if (!run || !conversationId) return;
    if (['completed', 'error', 'cancelled'].includes(run.status)) {
      AsyncStorage.removeItem(`agent-run:${conversationId}`).catch(() => {});
    }
  }, [agentRunAPI.agentRun?.status, conversationId]);

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

      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.messagesList}
        style={styles.flex}
        ListFooterComponent={
          <>
            {agentRunAPI.agentRun && (
              <AgentStatusPanel
                agentRun={agentRunAPI.agentRun}
                isLoading={agentRunAPI.isLoading}
                onAuthorize={handleAuthorizeStep}
                onDeny={handleDenyStep}
                onCancel={handleAgentCancel}
                onAnswerQuestion={handleAnswerQuestion}
              />
            )}
            <Animated.View style={{ height: keyboardAnim.height }} />
          </>
        }
      />

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
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
      </KeyboardStickyView>

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
