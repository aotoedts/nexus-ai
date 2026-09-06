import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface AgentToggleProps {
  enabled: boolean;
  isAgentActive: boolean;
  isLoading?: boolean;
  onToggle: (enabled: boolean, objective?: string) => void;
  onCancel?: () => void;
}

export const AgentToggle: React.FC<AgentToggleProps> = ({
  enabled,
  isAgentActive,
  isLoading = false,
  onToggle,
  onCancel,
}) => {
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [objective, setObjective] = useState('');

  const handleTogglePress = () => {
    if (enabled && !isAgentActive) {
      setShowObjectiveModal(true);
    } else if (isAgentActive && onCancel) {
      onCancel();
    } else {
      onToggle(false);
    }
  };

  const handleStartAgent = () => {
    if (objective.trim()) {
      setShowObjectiveModal(false);
      onToggle(true, objective);
      setObjective('');
    }
  };

  const buttonStyle = [
    styles.button,
    isAgentActive && styles.buttonActive,
    !enabled && styles.buttonDisabled,
  ];

  const buttonText = isAgentActive ? '⚙️ Agente Ativo' : '🤖 Ativar Agente';

  return (
    <>
      <TouchableOpacity
        style={buttonStyle}
        onPress={handleTogglePress}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isAgentActive ? '#fff' : '#6B7280'} />
        ) : (
          <Text style={[styles.buttonText, isAgentActive && styles.buttonTextActive]}>
            {buttonText}
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={showObjectiveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowObjectiveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Qual é o objetivo?</Text>
            <Text style={styles.modalDescription}>
              Descreva o que você quer que o agente faça
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ex: Publicar meu app no Play Store"
              placeholderTextColor="#9CA3AF"
              value={objective}
              onChangeText={setObjective}
              multiline
              maxLength={500}
              editable={!isLoading}
            />

            <Text style={styles.charCount}>
              {objective.length}/500
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowObjectiveModal(false)}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, !objective.trim() && styles.confirmButtonDisabled]}
                onPress={handleStartAgent}
                disabled={!objective.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Iniciar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  buttonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  buttonTextActive: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
