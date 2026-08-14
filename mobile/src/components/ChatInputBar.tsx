import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Text, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';

interface FileAttachment {
  name: string;
  documentId: string;
}

interface Props {
  onSend: (content: string, images?: string[], files?: FileAttachment[]) => void;
  disabled?: boolean;
}

export function ChatInputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

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

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/*', 'application/pdf', 'text/*', 'application/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/octet-stream',
      } as any);
      const { data } = await apiClient.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFiles((prev) => [...prev, { name: asset.name, documentId: data.document.id }]);
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleAttachPress = () => {
    Alert.alert('Anexar', 'O que você quer enviar?', [
      { text: 'Foto', onPress: pickImage },
      { text: 'Vídeo ou arquivo', onPress: pickFile },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));
  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && images.length === 0 && files.length === 0) || disabled || uploading) return;
    const fileNote = files.length ? files.map((f) => `[Anexo: ${f.name}]`).join(' ') : '';
    const finalContent = [trimmed, fileNote].filter(Boolean).join(' ');
    onSend(finalContent, images.length ? images : undefined, files.length ? files : undefined);
    setValue('');
    setImages([]);
    setFiles([]);
  };

  const canSend = (value.trim().length > 0 || images.length > 0 || files.length > 0) && !disabled && !uploading;

  return (
    <View>
      {(images.length > 0 || files.length > 0) && (
        <ScrollView horizontal style={styles.previewRow} showsHorizontalScrollIndicator={false}>
          {images.map((img, i) => (
            <View key={`img-${i}`} style={styles.previewItem}>
              <Image source={{ uri: img }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeBadge} onPress={() => removeImage(i)}>
                <Ionicons name="close" size={12} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}
          {files.map((f, i) => (
            <View key={`file-${i}`} style={styles.fileChip}>
              <Ionicons name="document-attach-outline" size={14} color={colors.text.primary} />
              <Text style={styles.fileChipText} numberOfLines={1}>{f.name}</Text>
              <TouchableOpacity onPress={() => removeFile(i)}>
                <Ionicons name="close" size={13} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.container}>
        <TouchableOpacity onPress={handleAttachPress} disabled={disabled || uploading} style={styles.attachButton}>
          {uploading ? (
            <ActivityIndicator size="small" color={colors.text.muted} />
          ) : (
            <Ionicons name="add-circle-outline" size={26} color={colors.text.muted} />
          )}
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
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ink[900], borderWidth: 1, borderColor: colors.ink[700], borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8, maxWidth: 160 },
  fileChipText: { color: colors.text.primary, fontSize: 12, flexShrink: 1 },
});
