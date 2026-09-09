import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';

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
  const [menuVisible, setMenuVisible] = useState(false);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handlePickImage = async () => {
    setMenuVisible(false);
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
    setMenuVisible(false);
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

        <TouchableOpacity
          style={[styles.iconButton, disabled && styles.iconButtonDisabled]}
          onPress={() => setMenuVisible(true)}
          disabled={disabled}
        >
          {isPickingImage ? (
            <ActivityIndicator size="small" color={colors.signal[400]} />
          ) : (
            <Ionicons name="add-circle" size={26} color={colors.signal[400]} />
          )}
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, disabled && styles.inputDisabled]}
            placeholder="Escreva uma mensagem..."
            placeholderTextColor={colors.text.muted}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            editable={!disabled}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, (disabled || !message.trim()) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={disabled || !message.trim()}
        >
          {disabled ? (
            <ActivityIndicator size="small" color={colors.ink[950]} />
          ) : (
            <Ionicons name="send" size={20} color={colors.ink[950]} />
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handlePickImage}>
              <Ionicons name="image" size={22} color={colors.signal[400]} />
              <Text style={styles.menuItemText}>Fotos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handlePickFile}>
              <Ionicons name="document" size={22} color={colors.signal[400]} />
              <Text style={styles.menuItemText}>Arquivo</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.ink[900],
    borderTopWidth: 1,
    borderTopColor: colors.ink[800],
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
    backgroundColor: colors.ink[800],
    borderRadius: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: colors.text.primary,
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
    backgroundColor: colors.signal[400],
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.ink[700],
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: colors.ink[900],
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 15,
    color: colors.text.primary,
  },
});
