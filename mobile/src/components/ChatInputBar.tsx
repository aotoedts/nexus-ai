import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';

interface Props {
  onSend: (content: string, images?: string[]) => void;
  disabled?: boolean;
}

export function ChatInputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const pickImage = async () => {
    if (images.length >= 4) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
    });
    if (result.canceled) return;

    const newImages = result.assets
      .filter((a) => a.base64)
      .map((a) => `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}`);
    setImages((prev) => [...prev, ...newImages].slice(0, 4));
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && images.length === 0) || disabled) return;
    onSend(trimmed, images.length ? images : undefined);
    setValue('');
    setImages([]);
  };

  const canSend = (value.trim().length > 0 || images.length > 0) && !disabled;

  return (
    <View>
      {images.length > 0 && (
        <ScrollView horizontal style={styles.previewRow} showsHorizontalScrollIndicator={false}>
          {images.map((img, i) => (
            <View key={i} style={styles.previewItem}>
              <Image source={{ uri: img }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeBadge} onPress={() => removeImage(i)}>
                <Ionicons name="close" size={12} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.container}>
        <TouchableOpacity onPress={pickImage} disabled={disabled} style={styles.attachButton}>
          <Ionicons name="add-circle-outline" size={26} color={colors.text.muted} />
        </TouchableOpacity>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="Escreva sua mensagem..."
          placeholderTextColor={colors.text.muted}
          style={styles.input}
          multiline
          editable={!disabled}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        >
          <Ionicons name="send" size={17} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: colors.ink[800], backgroundColor: colors.ink[950], padding: 10, gap: 8 },
  attachButton: { paddingBottom: 8 },
  input: { flex: 1, backgroundColor: colors.ink[900], borderWidth: 1, borderColor: colors.ink[700], borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: colors.text.primary, fontSize: 15, maxHeight: 120 },
  sendButton: { backgroundColor: colors.nexus[600], borderRadius: 12, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
  previewRow: { paddingHorizontal: 10, paddingTop: 8, backgroundColor: colors.ink[950] },
  previewItem: { marginRight: 8, position: 'relative' },
  previewImage: { width: 56, height: 56, borderRadius: 10 },
  removeBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.ink[700], borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
});
