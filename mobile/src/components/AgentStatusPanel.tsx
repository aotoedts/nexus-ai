import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { AgentRun, AgentRunStatus } from '../types/agent';
import { colors } from '../theme/colors';

interface AgentStatusPanelProps {
  agentRun: AgentRun;
  isLoading?: boolean;
  onAuthorize?: () => void;
  onDeny?: () => void;
  onCancel?: () => void;
  onAnswerQuestion?: (answer: string) => void;
}

const getStatusColor = (status: AgentRunStatus) => {
  switch (status) {
    case 'planning':
    case 'running':
      return colors.signal[400];
    case 'awaiting_authorization':
    case 'awaiting_device_action':
      return '#F59E0B';
    case 'completed':
      return colors.signal[400];
    case 'error':
    case 'cancelled':
      return colors.danger;
    default:
      return colors.text.muted;
  }
};

const getStatusLabel = (status: AgentRunStatus) => {
  switch (status) {
    case 'planning':
      return 'Planejando...';
    case 'running':
      return 'Executando...';
    case 'awaiting_authorization':
      return 'Aguardando Autorização';
    case 'awaiting_device_action':
      return 'Executando no dispositivo...';
    case 'completed':
      return 'Concluído';
    case 'error':
      return 'Erro';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Desconhecido';
  }
};

const getStepStatusIcon = (stepStatus: string) => {
  switch (stepStatus) {
    case 'completed':
      return '✅';
    case 'in_progress':
      return '⚙️';
    case 'error':
      return '❌';
    case 'pending':
    default:
      return '⬜';
  }
};

export const AgentStatusPanel: React.FC<AgentStatusPanelProps> = ({
  agentRun,
  isLoading = false,
  onAuthorize,
  onDeny,
  onCancel,
  onAnswerQuestion,
}) => {
  const [answerText, setAnswerText] = useState('');
  const statusColor = useMemo(() => getStatusColor(agentRun.status), [agentRun.status]);
  const statusLabel = useMemo(() => getStatusLabel(agentRun.status), [agentRun.status]);

  const isActive = ['planning', 'running', 'awaiting_authorization', 'awaiting_device_action'].includes(agentRun.status);
  const isQuestion = agentRun.status === 'awaiting_device_action' && agentRun.pendingAuthorization?.action === 'ask_user_question';
  const questionOptions = (agentRun.pendingAuthorization?.details?.options as unknown as string[] | undefined)?.filter(
    (o) => typeof o === 'string'
  );

  const handleSubmitAnswer = () => {
    if (!answerText.trim()) return;
    onAnswerQuestion?.(answerText.trim());
    setAnswerText('');
  };

  return (
    <View style={[styles.bubble, { borderLeftColor: statusColor }]}>
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          {(agentRun.status === 'planning' || agentRun.status === 'running') && (
            <ActivityIndicator size="small" color={statusColor} />
          )}
          {!(agentRun.status === 'planning' || agentRun.status === 'running') && (
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        {isActive && onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            disabled={isLoading}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.objective}>{agentRun.objective}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((agentRun.currentStepIndex + 1) / Math.max(agentRun.steps.length, 1)) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {agentRun.currentStepIndex + 1} de {agentRun.steps.length} passos
        </Text>
      </View>

      {agentRun.steps.length > 0 && (
        <View style={styles.section}>
          <ScrollView style={styles.stepsList} scrollEnabled={agentRun.steps.length > 5}>
            {agentRun.steps.map((step, idx) => (
              <View key={step.id} style={styles.stepItem}>
                <Text style={styles.stepIcon}>{getStepStatusIcon(step.status)}</Text>
                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepTitle,
                      idx === agentRun.currentStepIndex && styles.stepTitleActive,
                    ]}
                  >
                    {step.title}
                  </Text>
                  {step.description && (
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  )}
                  {step.result && (
                    <Text style={styles.stepResult}>{step.result}</Text>
                  )}
                  {step.error && (
                    <Text style={styles.stepError}>{step.error}</Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {isQuestion && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 {agentRun.pendingAuthorization?.prompt || 'O agente tem uma pergunta'}</Text>
          {questionOptions && questionOptions.length > 0 ? (
            <View style={styles.optionsContainer}>
              {questionOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => onAnswerQuestion?.(option)}
                  disabled={isLoading}
                  style={styles.optionButton}
                >
                  <Text style={styles.optionButtonText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.answerRow}>
              <TextInput
                style={styles.answerInput}
                placeholder="Digite sua resposta..."
                placeholderTextColor={colors.text.muted}
                value={answerText}
                onChangeText={setAnswerText}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={handleSubmitAnswer}
                disabled={isLoading || !answerText.trim()}
                style={[styles.answerButton, (!answerText.trim() || isLoading) && styles.answerButtonDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.ink[950]} />
                ) : (
                  <Text style={styles.answerButtonText}>Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {agentRun.pendingAuthorization && agentRun.status === 'awaiting_authorization' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Autorização Necessária</Text>
          <Text style={styles.authPrompt}>{agentRun.pendingAuthorization.prompt}</Text>

          {agentRun.pendingAuthorization.details && (
            <View style={styles.authDetails}>
              {Object.entries(agentRun.pendingAuthorization.details).map(([key, value]) => (
                <View key={key} style={styles.authDetail}>
                  <Text style={styles.authDetailKey}>{key}</Text>
                  <Text style={styles.authDetailValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.authButtonsContainer}>
            <TouchableOpacity
              onPress={onAuthorize}
              disabled={isLoading}
              style={[styles.button, styles.authorizeButton]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.ink[950]} />
              ) : (
                <Text style={styles.authorizeButtonText}>Autorizar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onDeny}
              disabled={isLoading}
              style={[styles.button, styles.denyButton]}
            >
              <Text style={styles.denyButtonText}>Recusar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {agentRun.pendingAuthorization && agentRun.status === 'awaiting_device_action' && !isQuestion && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Ação no Dispositivo</Text>
          <Text style={styles.authPrompt}>{agentRun.pendingAuthorization.prompt}</Text>
          <View style={styles.statusBadge}>
            <ActivityIndicator size="small" color="#F59E0B" />
            <Text style={[styles.statusText, { color: '#F59E0B' }]}>Executando automaticamente...</Text>
          </View>
        </View>
      )}

      {agentRun.status === 'completed' && agentRun.result && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Resultado</Text>
          <Text style={styles.result}>{agentRun.result}</Text>
        </View>
      )}

      {agentRun.error && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❌ Erro</Text>
          <Text style={styles.errorMessage}>{agentRun.error.message}</Text>
        </View>
      )}

      {agentRun.totalDuration && (
        <View style={styles.metadata}>
          <Text style={styles.metadataText}>
            ⏱️ Duração: {(agentRun.totalDuration / 1000).toFixed(2)}s
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.ink[800],
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.ink[700],
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.ink[900],
  },
  cancelButtonText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 6,
  },
  objective: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  progressBar: {
    height: 5,
    backgroundColor: colors.ink[900],
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.signal[400],
  },
  progressText: {
    fontSize: 11,
    color: colors.text.muted,
  },
  stepsList: {
    maxHeight: 200,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  stepIcon: {
    fontSize: 14,
    width: 18,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  stepTitleActive: {
    color: colors.signal[400],
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  stepResult: {
    fontSize: 11,
    color: colors.signal[400],
    marginTop: 4,
    fontStyle: 'italic',
  },
  stepError: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    backgroundColor: colors.ink[900],
    borderWidth: 1,
    borderColor: colors.nexus[500],
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  optionButtonText: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  answerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  answerInput: {
    flex: 1,
    backgroundColor: colors.ink[900],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text.primary,
  },
  answerButton: {
    backgroundColor: colors.signal[400],
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerButtonDisabled: {
    backgroundColor: colors.ink[700],
  },
  answerButtonText: {
    color: colors.ink[950],
    fontSize: 13,
    fontWeight: '600',
  },
  authPrompt: {
    fontSize: 13,
    color: colors.text.primary,
    lineHeight: 18,
    marginBottom: 8,
  },
  authDetails: {
    backgroundColor: colors.ink[900],
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#F59E0B',
  },
  authDetail: {
    marginBottom: 6,
  },
  authDetailKey: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    marginBottom: 2,
  },
  authDetailValue: {
    fontSize: 12,
    color: colors.text.primary,
  },
  authButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorizeButton: {
    backgroundColor: colors.signal[400],
  },
  authorizeButtonText: {
    color: colors.ink[950],
    fontSize: 13,
    fontWeight: '600',
  },
  denyButton: {
    backgroundColor: colors.ink[900],
    borderWidth: 1,
    borderColor: colors.ink[700],
  },
  denyButtonText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  result: {
    fontSize: 13,
    color: colors.signal[400],
    lineHeight: 18,
  },
  errorMessage: {
    fontSize: 13,
    color: colors.danger,
    lineHeight: 18,
  },
  metadata: {
    borderTopWidth: 1,
    borderTopColor: colors.ink[700],
    paddingTop: 8,
    marginTop: 4,
  },
  metadataText: {
    fontSize: 11,
    color: colors.text.muted,
  },
});
