import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import { CHAT_COMPLIANCE_BANNER } from '@/firebase/chatSafety';
import type { LocalChatAttachmentInput } from '@/utils/chatAttachments';

export const supportedChatMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'video/mp4',
  'text/plain',
] as const;

export type PendingChatAttachment = LocalChatAttachmentInput & {
  previewUri?: string;
};

type ChatComposerProps = {
  roomId: string;
  userId: string;
  value: string;
  disabled?: boolean;
  isUploading?: boolean;
  embedded?: boolean;
  bottomInset?: number;
  onChangeText: (value: string) => void;
  onSend: (payload: { text: string; localAttachments: LocalChatAttachmentInput[] }) => Promise<void>;
  onError: (message: string) => void;
};

function mimeTypeFromFileName(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

function isSupportedAttachment(mimeType: string, fileName: string) {
  const lower = fileName.toLowerCase();
  return supportedChatMimeTypes.includes(mimeType as typeof supportedChatMimeTypes[number])
    || ['.pdf', '.doc', '.docx', '.xlsx', '.pptx', '.zip', '.png', '.jpg', '.jpeg', '.mp4'].some((ext) => lower.endsWith(ext));
}

export function ChatComposer({
  roomId: _roomId,
  userId: _userId,
  value,
  disabled = false,
  isUploading = false,
  embedded = false,
  bottomInset = 0,
  onChangeText,
  onSend,
  onError,
}: ChatComposerProps) {
  const [pendingAttachments, setPendingAttachments] = useState<PendingChatAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<TextInput | null>(null);

  const uploadBusy = isUploading || isSending;
  const canSend = !disabled && !uploadBusy && (value.trim().length > 0 || pendingAttachments.length > 0);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const submitMessage = useCallback(async (text: string, localAttachments: LocalChatAttachmentInput[]) => {
    await onSend({ text, localAttachments });
  }, [onSend]);

  const handlePickPhoto = useCallback(async () => {
    if (disabled || uploadBusy) return;

    const messageText = value;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Photo library permission is required.');
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.82,
      });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      setIsSending(true);
      await submitMessage(messageText, [{
        uri: asset.uri,
        fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        sizeBytes: asset.fileSize,
      }]);
      setPendingAttachments([]);
      onChangeText('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to attach photo.';
      onError(message);
    } finally {
      setIsSending(false);
    }
  }, [disabled, onChangeText, onError, submitMessage, uploadBusy, value]);

  const handleAttachFile = useCallback(async () => {
    if (disabled || uploadBusy) return;

    const messageText = value;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: [...supportedChatMimeTypes],
      });
      if (result.canceled || result.assets.length === 0) return;

      const localAttachments: LocalChatAttachmentInput[] = [];
      for (const asset of result.assets) {
        const mimeType = asset.mimeType ?? mimeTypeFromFileName(asset.name);
        if (!isSupportedAttachment(mimeType, asset.name)) {
          onError(`Unsupported file: ${asset.name}`);
          continue;
        }
        localAttachments.push({
          uri: asset.uri,
          fileName: asset.name,
          mimeType,
          sizeBytes: asset.size,
        });
      }

      if (localAttachments.length === 0) {
        throw new Error('No supported files were attached.');
      }

      setIsSending(true);
      await submitMessage(messageText, localAttachments);
      setPendingAttachments([]);
      onChangeText('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to attach file.';
      onError(message);
    } finally {
      setIsSending(false);
    }
  }, [disabled, onChangeText, onError, submitMessage, uploadBusy, value]);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const messageText = value;
    try {
      setIsSending(true);
      const localAttachments = pendingAttachments.map(({ previewUri: _previewUri, ...attachment }) => attachment);
      await submitMessage(messageText, localAttachments);
      setPendingAttachments([]);
      onChangeText('');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to send message.');
    } finally {
      setIsSending(false);
    }
  }, [canSend, onChangeText, onError, pendingAttachments, submitMessage, value]);

  return (
    <View style={[
      styles.footer,
      embedded ? styles.footerEmbedded : null,
      { paddingBottom: Math.max(bottomInset, embedded ? 8 : 6) },
    ]}>
      <Text style={styles.compliance}>{CHAT_COMPLIANCE_BANNER}</Text>
      <TextInput
        ref={inputRef}
        multiline
        editable={!disabled}
        autoFocus
        placeholder="Write a message..."
        placeholderTextColor={colors.subtle}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
      />
      {pendingAttachments.length > 0 ? (
        <View style={styles.pendingRow}>
          {pendingAttachments.map((attachment) => (
            <View key={`${attachment.uri}-${attachment.fileName}`} style={styles.pendingCard}>
              {attachment.previewUri ? (
                <Image source={{ uri: attachment.previewUri }} style={styles.pendingImage} />
              ) : (
                <Text style={styles.pendingName} numberOfLines={2}>{attachment.fileName}</Text>
              )}
              <Pressable onPress={() => setPendingAttachments((current) => current.filter((item) => item.uri !== attachment.uri))}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {uploadBusy ? <Text style={styles.uploading}>{isSending ? 'Sending...' : 'Uploading attachment...'}</Text> : null}
      <View style={styles.actions}>
        <ComposerButton label="📎 Attach File" onPress={handleAttachFile} disabled={disabled || uploadBusy} />
        <ComposerButton label="🖼 Photo" onPress={handlePickPhoto} disabled={disabled || uploadBusy} />
        <Pressable
          accessibilityRole="button"
          disabled={!canSend}
          onPress={handleSend}
          style={[styles.sendButton, !canSend ? styles.sendButtonDisabled : null]}
        >
          <Text style={styles.sendLabel}>{isSending ? 'Sending...' : 'Send'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ComposerButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButton, disabled ? styles.actionButtonDisabled : null]}
    >
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.panel,
    borderTopColor: 'rgba(216, 201, 163, 0.22)',
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingTop: 8,
  },
  footerEmbedded: {
    borderTopColor: 'rgba(216, 201, 163, 0.16)',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 14,
  },
  compliance: {
    color: colors.subtle,
    fontSize: 10,
    lineHeight: 14,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    maxHeight: 96,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    textAlignVertical: 'top',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionButton: {
    backgroundColor: colors.panelMuted,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  pendingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pendingCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 6,
    padding: spacing.sm,
    width: 120,
  },
  pendingImage: {
    borderRadius: radii.sm,
    height: 72,
    width: '100%',
  },
  pendingName: {
    color: colors.text,
    fontSize: 12,
  },
  remove: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  uploading: {
    color: colors.muted,
    fontSize: 12,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    marginLeft: 'auto',
    minWidth: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendLabel: {
    color: colors.black,
    fontSize: 13,
    fontWeight: '800',
  },
});
