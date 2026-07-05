import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import type { ChatAttachment, ChatMessage } from '@/types/InvestmentChat';

import { formatFileSize, formatMessageTime, getMessageStatusLabel } from './chatUtils';

type MessageBubbleProps = {
  message: ChatMessage;
  currentUserId: string;
  isFounder: boolean;
  onOpenUrl: (url: string) => void;
  onLongPress: (message: ChatMessage) => void;
  onToggleReaction: (message: ChatMessage, reaction: string) => void;
};

function attachmentKindLabel(kind: ChatAttachment['kind']) {
  if (kind === 'image') return 'Image';
  if (kind === 'video') return 'Video';
  if (kind === 'voice') return 'Voice';
  return 'Document';
}

export function MessageBubble({
  message,
  currentUserId,
  isFounder,
  onOpenUrl,
  onLongPress,
  onToggleReaction,
}: MessageBubbleProps) {
  const isOwn = message.senderId === currentUserId;
  const isDeleted = Boolean(message.deletedAt);
  const isSystem = message.type === 'system';
  const isFounderMessage = message.senderRole === 'founder' || (isOwn && isFounder);

  if (isSystem) {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.text || message.body}</Text>
      </View>
    );
  }

  return (
    <Pressable
      onLongPress={() => onLongPress(message)}
      style={[
        styles.row,
        isFounderMessage ? styles.rowRight : styles.rowLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isFounderMessage ? styles.founderBubble : styles.investorBubble,
          message.isPinned ? styles.pinnedBubble : null,
        ]}
      >
        {message.isPinned ? <Text style={styles.pinnedLabel}>Pinned</Text> : null}
        {!isOwn ? <Text style={styles.author}>{message.senderName}</Text> : null}
        {isDeleted ? (
          <Text style={styles.deletedText}>This message was deleted.</Text>
        ) : (
          <>
            {message.text ? <Text style={styles.body}>{message.text}</Text> : null}
            {(message.attachments ?? []).map((attachment) => (
              <AttachmentPreview
                key={attachment.id}
                attachment={attachment}
                onOpenUrl={onOpenUrl}
              />
            ))}
          </>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{formatMessageTime(message.createdAt)}</Text>
          {message.editedAt ? <Text style={styles.meta}>Edited</Text> : null}
          {isOwn ? <Text style={styles.status}>{getMessageStatusLabel(message, currentUserId)}</Text> : null}
        </View>
        {!isDeleted && message.reactions && Object.keys(message.reactions).length > 0 ? (
          <View style={styles.reactionRow}>
            {Object.entries(message.reactions).map(([emoji, userIds]) => {
              if (!userIds.length) return null;
              const active = userIds.includes(currentUserId);
              return (
                <Pressable
                  key={emoji}
                  style={[styles.reactionChip, active ? styles.reactionChipActive : null]}
                  onPress={() => onToggleReaction(message, emoji)}
                >
                  <Text style={styles.reactionText}>{emoji} {userIds.length}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function AttachmentPreview({
  attachment,
  onOpenUrl,
}: {
  attachment: ChatAttachment;
  onOpenUrl: (url: string) => void;
}) {
  if (attachment.kind === 'image') {
    return (
      <Pressable onPress={() => onOpenUrl(attachment.url)}>
        <Image source={{ uri: attachment.url }} style={styles.image} resizeMode="cover" />
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.documentCard} onPress={() => onOpenUrl(attachment.url)}>
      <Text style={styles.documentKind}>{attachmentKindLabel(attachment.kind)}</Text>
      <Text style={styles.documentName} numberOfLines={2}>{attachment.name}</Text>
      {attachment.sizeBytes ? <Text style={styles.documentSize}>{formatFileSize(attachment.sizeBytes)}</Text> : null}
      <Text style={styles.downloadLabel}>Download</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.sm,
    maxWidth: '88%',
  },
  rowLeft: {
    alignSelf: 'flex-start',
  },
  rowRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  founderBubble: {
    backgroundColor: '#2A2418',
    borderColor: colors.luxuryGold,
  },
  investorBubble: {
    backgroundColor: colors.panelMuted,
    borderColor: '#3A3430',
  },
  pinnedBubble: {
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  pinnedLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  author: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  deletedText: {
    color: colors.subtle,
    fontStyle: 'italic',
    fontSize: 14,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  meta: {
    color: colors.subtle,
    fontSize: 11,
  },
  status: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  image: {
    borderRadius: radii.sm,
    height: 180,
    marginTop: spacing.xs,
    width: 220,
  },
  documentCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 4,
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  documentKind: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  documentName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  documentSize: {
    color: colors.muted,
    fontSize: 12,
  },
  downloadLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  reactionChip: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reactionChipActive: {
    backgroundColor: '#2A2418',
    borderColor: colors.accent,
  },
  reactionText: {
    color: colors.text,
    fontSize: 12,
  },
  systemWrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  systemText: {
    backgroundColor: colors.panelMuted,
    borderRadius: radii.pill,
    color: colors.muted,
    fontSize: 12,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    textAlign: 'center',
  },
});
