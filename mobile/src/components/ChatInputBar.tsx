import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface ChatInputBarProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  agentButton?: React.ReactNode;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSend,
  disabled = false,
  agentButton,
}) => {
  const [message, setMessage] = useState('');
  const [isPickingImage, setIsPickingImage] = useState(false);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handlePickImage = async () => {
    setIsPickingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64 = result.assets[0].base64;
        onSend(`[Image: ${base64.substring(0, 50)}...]`);
      }
    } catch (error) {
      console.error('Erro ao pegar imagem:', error);
    } finally {
      setIsPickingImage(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        onSend(`[Arquivo: ${result.assets[0].name}]`);
      }
    } catch (error) {
      console.error('Erro ao pegar arquivo:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        {agentButton}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, disabled && styles.inputDisabled]}
            placeholder="Escreva uma mensagem..."
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            editable={!disabled}
          />

          <TouchableOpacity
            style={[styles.iconButton, isPickingImage && styles.iconButtonDisabled]}
            onPress={handlePickImage}
            disabled={disabled || isPickingImage}
          >
            {isPickingImage ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Ionicons name="image" size={20} color="#3B82F6" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, disabled && styles.iconButtonDisabled]}
            onPress={handlePickFile}
            disabled={disabled}
          >
            <Ionicons name="document" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, (disabled || !message.trim()) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={disabled || !message.trim()}
        >
          {disabled ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1F2937',
    maxHeight: 100,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
