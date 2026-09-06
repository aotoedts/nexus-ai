import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { AgentRun, AgentRunStatus } from '../types/agent';

interface AgentStatusPanelProps {
  agentRun: AgentRun;
  isLoading?: boolean;
  onAuthorize?: () => void;
  onDeny?: () => void;
  onCancel?: () => void;
}

const getStatusColor = (status: AgentRunStatus) => {
  switch (status) {
    case 'planning':
    case 'running':
      return '#3B82F6';
    case 'awaiting_authorization':
      return '#F59E0B';
    case 'completed':
      return '#10B981';
    case 'error':
    case 'cancelled':
      return '#EF4444';
    default:
      return '#6B7280';
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
}) => {
  const statusColor = useMemo(() => getStatusColor(agentRun.status), [agentRun.status]);
  const statusLabel = useMemo(() => getStatusLabel(agentRun.status), [agentRun.status]);
  const currentStep = useMemo(
    () => agentRun.steps[agentRun.currentStepIndex],
    [agentRun.steps, agentRun.currentStepIndex]
  );

  const isActive = ['planning', 'running', 'awaiting_authorization'].includes(agentRun.status);

  return (
    <View style={[styles.container, { borderLeftColor: statusColor }]}>
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          {(agentRun.status === 'planning' || agentRun.status === 'running') && (
            <ActivityIndicator size="small" color={statusColor} />
          )}
          {!(agentRun.status === 'planning' || agentRun.status === 'running') && (
            <Text style={[styles.statusDot, { backgroundColor: statusColor }]} />
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        
        {isActive && onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            disabled={isLoading}
            style={[styles.button, styles.cancelButton]}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Objetivo</Text>
        <Text style={styles.objective}>{agentRun.objective}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progresso</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((agentRun.currentStepIndex + 1) / agentRun.steps.length) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {agentRun.currentStepIndex + 1} de {agentRun.steps.length} passos
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Passos</Text>
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

      {agentRun.pendingAuthorization && (
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
                <ActivityIndicator size="small" color="#fff" />
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
          {agentRun.error.details && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorDetailsText}>
                {JSON.stringify(agentRun.error.details, null, 2)}
              </Text>
            </View>
          )}
        </View>
      )}

      {agentRun.totalDuration && (
        <View style={styles.metadata}>
          <Text style={styles.metadataText}>
            ⏱️ Duração: {(agentRun.totalDuration / 1000).toFixed(2)}s
          </Text>
          {agentRun.tokenUsage && (
            <Text style={styles.metadataText}>
              🔤 Tokens: {agentRun.tokenUsage.input} entrada, {agentRun.tokenUsage.output} saída
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  objective: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
  },
  stepsList: {
    maxHeight: 200,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  stepIcon: {
    fontSize: 16,
    width: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  stepTitleActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  stepResult: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
    fontStyle: 'italic',
  },
  stepError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  authPrompt: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 18,
    marginBottom: 8,
  },
  authDetails: {
    backgroundColor: '#fff',
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
    color: '#6B7280',
    marginBottom: 2,
  },
  authDetailValue: {
    fontSize: 12,
    color: '#1F2937',
  },
  authButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  authorizeButton: {
    flex: 1,
    backgroundColor: '#10B981',
  },
  authorizeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  denyButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  denyButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  result: {
    fontSize: 13,
    color: '#10B981',
    lineHeight: 18,
  },
  errorMessage: {
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
    marginBottom: 8,
  },
  errorDetails: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#EF4444',
  },
  errorDetailsText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  metadata: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  metadataText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
});
