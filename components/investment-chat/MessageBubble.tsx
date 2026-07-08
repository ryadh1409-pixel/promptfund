import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import type { ChatAttachment, ChatMessage } from '@/types/InvestmentChat';

import { DeletedMessage } from '@/components/chat/DeletedMessage';
import { shouldRenderMessage } from '@/utils/chatMessageVisibility';

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

function getMessageDisplayText(message: ChatMessage) {
  return message.text?.trim() || message.body?.trim() || '';
}

function getPrimaryAttachment(message: ChatMessage) {
  if (message.attachmentUrl) {
    return {
      url: message.attachmentUrl,
      thumbnailUrl: message.thumbnailUrl ?? message.attachmentUrl,
      name: message.attachments?.[0]?.name ?? 'Attachment',
      mimeType: message.attachments?.[0]?.mimeType ?? 'application/octet-stream',
      kind: message.type === 'image' ? 'image' as const : message.attachments?.[0]?.kind ?? 'document',
      sizeBytes: message.attachments?.[0]?.sizeBytes,
    };
  }

  return message.attachments?.[0];
}

function MessageContent({
  message,
  onOpenUrl,
}: {
  message: ChatMessage;
  onOpenUrl: (url: string) => void;
}) {
  const displayText = getMessageDisplayText(message);
  const primaryAttachment = getPrimaryAttachment(message);
  const legacyAttachments = message.attachments ?? [];

  if (message.type === 'image' && primaryAttachment?.url) {
    const imageUri = 'thumbnailUrl' in primaryAttachment && primaryAttachment.thumbnailUrl
      ? primaryAttachment.thumbnailUrl
      : primaryAttachment.url;
    return (
      <>
        <Pressable onPress={() => onOpenUrl(primaryAttachment.url)}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
          />
        </Pressable>
        {displayText ? <Text style={styles.body}>{displayText}</Text> : null}
      </>
    );
  }

  if (message.type === 'file' && primaryAttachment) {
    return (
      <>
        <FileAttachmentCard attachment={primaryAttachment} onOpenUrl={onOpenUrl} />
        {displayText && displayText !== primaryAttachment.name ? (
          <Text style={styles.body}>{displayText}</Text>
        ) : null}
      </>
    );
  }

  if (displayText) {
    return <Text style={styles.body}>{displayText}</Text>;
  }

  if (legacyAttachments.length > 0) {
    return legacyAttachments.map((attachment) => (
      <AttachmentPreview
        key={attachment.id}
        attachment={attachment}
        onOpenUrl={onOpenUrl}
      />
    ));
  }

  return null;
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
  const isDeleted = Boolean(message.deleted || message.deletedAt);

  if (!shouldRenderMessage(message)) {
    return null;
  }
  const isFounderMessage = message.senderRole === 'founder' || (isOwn && isFounder);

  if (message.type === 'system') {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{getMessageDisplayText(message)}</Text>
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
          <DeletedMessage />
        ) : (
          <MessageContent message={message} onOpenUrl={onOpenUrl} />
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

function FileAttachmentCard({
  attachment,
  onOpenUrl,
}: {
  attachment: {
    url: string;
    name: string;
    mimeType?: string;
    kind?: ChatAttachment['kind'];
    sizeBytes?: number;
  };
  onOpenUrl: (url: string) => void;
}) {
  return (
    <Pressable style={styles.documentCard} onPress={() => onOpenUrl(attachment.url)}>
      <Text style={styles.documentKind}>{attachmentKindLabel(attachment.kind ?? 'document')}</Text>
      <Text style={styles.documentName} numberOfLines={2}>{attachment.name}</Text>
      {attachment.sizeBytes ? <Text style={styles.documentSize}>{formatFileSize(attachment.sizeBytes)}</Text> : null}
      <Text style={styles.downloadLabel}>Download</Text>
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

  return <FileAttachmentCard attachment={attachment} onOpenUrl={onOpenUrl} />;
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
    fontSize: 10,
  },
  status: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  image: {
    borderRadius: radii.sm,
    height: 205,
    marginTop: spacing.xs,
    width: 252,
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
