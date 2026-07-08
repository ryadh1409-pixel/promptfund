import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import type { ChatAttachment, ChatMessage } from '@/types/InvestmentChat';
import { formatFileSize } from '@/components/investment-chat/chatUtils';

export function DealRoomAttachmentsSection({ messages }: { messages: ChatMessage[] }) {
  const attachments = messages.flatMap((message) => (message.attachments ?? []).map((attachment) => ({
    ...attachment,
    messageId: message.id,
    senderName: message.senderName,
    createdAt: message.createdAt,
  })));

  if (attachments.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No attachments yet.</Text>
        <Text style={styles.emptyBody}>Files and images shared in chat will appear here.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {attachments.map((attachment) => (
        <AttachmentRow key={`${attachment.messageId}-${attachment.id}`} attachment={attachment} />
      ))}
    </View>
  );
}

function AttachmentRow({
  attachment,
}: {
  attachment: ChatAttachment & { senderName: string; createdAt: string };
}) {
  return (
    <Pressable style={styles.card} onPress={() => Linking.openURL(attachment.url)}>
      <Text style={styles.kind}>{attachment.kind.toUpperCase()}</Text>
      <Text style={styles.name} numberOfLines={2}>{attachment.name}</Text>
      <Text style={styles.meta}>{attachment.senderName} · {formatFileSize(attachment.sizeBytes)}</Text>
      <Text style={styles.download}>Download</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm,
  },
  kind: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    color: colors.subtle,
    fontSize: 11,
  },
  download: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
