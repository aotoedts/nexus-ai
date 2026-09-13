import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
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
import { AccessibilityBridge } from '../native/AccessibilityBridge';
import { AgentStatusPanel } from '../components/AgentStatusPanel';
import { AgentToggle } from '../components/AgentToggle';
import { MessageBubble } from '../components/MessageBubble';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
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
      if (objective && conversationId) {
        try {
          setAgentObjective(objective);
          await apiClient.patch('/agents/status', { agentEnabled: true });
          await agentRunAPI.startAgent(conversationId, objective);
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
  const [deviceQuestion, setDeviceQuestion] = useState<string | null>(null);
  const [deviceAnswer, setDeviceAnswer] = useState('');
  const processedDeviceAction = useRef<string | null>(null);

  useEffect(() => {
    const run = agentRunAPI.agentRun;
    if (!run || run.status !== 'awaiting_device_action' || !run.pendingAuthorization) return;

    const actionKey = `${run.id}:${run.steps.length}`;
    if (processedDeviceAction.current === actionKey) return;

    const { action, details } = run.pendingAuthorization;

    if (action === 'ask_user_question') {
      processedDeviceAction.current = actionKey;
      setDeviceQuestion(String(details?.question ?? 'O agente tem uma pergunta.'));
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

  const handleDeviceAnswerSubmit = useCallback(async () => {
    const run = agentRunAPI.agentRun;
    if (!run || !deviceAnswer.trim()) return;
    try {
      await agentRunAPI.submitDeviceResult(run.id, { answer: deviceAnswer.trim() });
      setDeviceQuestion(null);
      setDeviceAnswer('');
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
    }
  }, [agentRunAPI, deviceAnswer]);

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
      />

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
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

      <Modal visible={!!deviceQuestion} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.deviceQuestionOverlay}>
          <View style={styles.deviceQuestionBox}>
            <Text style={styles.deviceQuestionTitle}>O agente precisa saber</Text>
            <Text style={styles.deviceQuestionText}>{deviceQuestion}</Text>
            <TextInput
              style={styles.deviceQuestionInput}
              placeholder="Sua resposta..."
              placeholderTextColor={colors.text.muted}
              value={deviceAnswer}
              onChangeText={setDeviceAnswer}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.deviceQuestionButton, !deviceAnswer.trim() && styles.deviceQuestionButtonDisabled]}
              onPress={handleDeviceAnswerSubmit}
              disabled={!deviceAnswer.trim()}
            >
              <Text style={styles.deviceQuestionButtonText}>Responder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  deviceQuestionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  deviceQuestionBox: {
    backgroundColor: colors.ink[900],
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  deviceQuestionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  deviceQuestionText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  deviceQuestionInput: {
    borderWidth: 1,
    borderColor: colors.ink[800],
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
  },
  deviceQuestionButton: {
    backgroundColor: colors.signal[400],
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deviceQuestionButtonDisabled: {
    opacity: 0.5,
  },
  deviceQuestionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink[950],
  },
});
