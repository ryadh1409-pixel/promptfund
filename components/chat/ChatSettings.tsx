import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { ScreenHeader, ScreenHeaderIconButton, ScreenHeaderTextButton } from '@/components/layout/ScreenHeader';
import { colors, radii, spacing } from '@/constants/theme';
import { chatMuteService } from '@/services/chat/muteService';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import type { BlockStatus } from '@/services/userService';
import type { DiscussionRoom } from '@/types/InvestmentFlow';
import type { ChatMessage } from '@/types/InvestmentChat';
import type { ChatMuteDuration, ChatToastPayload } from '@/types/ChatSafety';
import type { User } from '@/types/User';
import { showNativeActionSheet, showNativeAlertActionSheet } from '@/utils/nativeActionSheet';

type ChatSettingsProps = {
  visible: boolean;
  room: DiscussionRoom;
  currentUser: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role'>;
  counterparty: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role' | 'photoURL'> | null;
  messages: ChatMessage[];
  onClose: () => void;
  onToast: (payload: ChatToastPayload) => void;
  onReportUser: () => void;
  onConversationDeleted?: () => void;
  blockStatus: BlockStatus;
  isMuted: boolean;
  onBlockUser: () => Promise<void>;
  onUnblockUser: () => Promise<void>;
  onMuteConversation: (duration: ChatMuteDuration) => Promise<void>;
  onUnmuteConversation: () => Promise<void>;
};

const muteOptions: Array<{ label: string; value: ChatMuteDuration }> = [
  { label: 'Mute for 8 hours', value: '8_hours' },
  { label: 'Mute for 24 hours', value: '24_hours' },
  { label: 'Mute forever', value: 'forever' },
];

export function ChatSettings({
  visible,
  room,
  currentUser,
  counterparty,
  messages,
  onClose,
  onToast,
  onReportUser,
  onConversationDeleted,
  blockStatus,
  isMuted,
  onBlockUser,
  onUnblockUser,
  onMuteConversation,
  onUnmuteConversation,
}: ChatSettingsProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [sharedFilesVisible, setSharedFilesVisible] = useState(false);

  const sharedFiles = useMemo(
    () => messages.filter((message) => !message.deleted && !message.deletedAt && (
      message.type === 'image'
      || message.type === 'file'
      || (message.attachments?.length ?? 0) > 0
    )),
    [messages],
  );

  const isBlockedByMe = blockStatus.blockedByMe;

  async function runAction(action: () => Promise<void>, successMessage: string) {
    try {
      setIsWorking(true);
      await action();
      onToast({ type: 'success', message: successMessage });
    } catch (error) {
      onToast({ type: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setIsWorking(false);
    }
  }

  function openMutePicker() {
    const usedNativeSheet = showNativeActionSheet({
      title: 'Mute conversation',
      options: muteOptions.map((option) => ({
        label: option.label,
        onPress: () => {
          void runAction(
            () => onMuteConversation(option.value),
            option.value === 'forever'
              ? 'Conversation muted forever.'
              : `Conversation muted for ${option.label.replace('Mute for ', '')}.`,
          );
        },
      })),
    });

    if (!usedNativeSheet) {
      showNativeAlertActionSheet({
        title: 'Mute conversation',
        message: 'Choose how long to mute notifications for this chat.',
        options: [
          ...muteOptions.map((option) => ({
            text: option.label,
            onPress: () => {
              void runAction(
                () => onMuteConversation(option.value),
                'Conversation muted.',
              );
            },
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      });
    }
  }

  function confirmUnblock() {
    if (!counterparty) return;
    Alert.alert(
      'Unblock this user?',
      'You will be able to exchange messages again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => {
            void runAction(
              onUnblockUser,
              'User unblocked.',
            );
          },
        },
      ],
    );
  }

  function confirmUnmute() {
    Alert.alert(
      'Turn notifications back on for this conversation?',
      'Notifications will resume immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmute',
          onPress: () => {
            void runAction(
              onUnmuteConversation,
              'Conversation unmuted.',
            );
          },
        },
      ],
    );
  }

  const settingsActions = [
    {
      label: 'Report User',
      onPress: () => {
        onClose();
        onReportUser();
      },
    },
    {
      label: isBlockedByMe ? 'Unblock User' : 'Block User',
      destructive: !isBlockedByMe,
      hidden: !counterparty,
      onPress: () => {
        if (!counterparty) return;
        if (isBlockedByMe) {
          confirmUnblock();
          return;
        }

        void runAction(async () => {
          await onBlockUser();
        }, 'User blocked.');
      },
    },
    {
      label: isMuted ? 'Unmute Conversation' : 'Mute Conversation',
      onPress: () => {
        if (isMuted) {
          confirmUnmute();
          return;
        }
        openMutePicker();
      },
    },
    {
      label: 'View Shared Files',
      onPress: () => setSharedFilesVisible(true),
    },
    {
      label: 'Delete Conversation',
      destructive: true,
      onPress: () => {
        Alert.alert(
          'Delete conversation',
          'This hides the conversation from your inbox. The other participant will still see it.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                void runAction(async () => {
                  await chatMuteService.deleteConversationForUser(room.id, currentUser.id);
                  onConversationDeleted?.();
                }, 'Conversation deleted from your inbox.');
              },
            },
          ],
        );
      },
    },
  ].filter((action) => !action.hidden);

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <AppScreen horizontalPadding={false} contentContainerStyle={styles.modalBody}>
          <ScreenHeader
            title="Chat Settings"
            rightAction={<ScreenHeaderTextButton label="Done" onPress={onClose} />}
          />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {isWorking ? <Text style={styles.workingLabel}>Applying changes...</Text> : null}
            {settingsActions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                disabled={isWorking}
                onPress={action.onPress}
                style={styles.actionRow}
              >
                <Text style={[styles.actionLabel, action.destructive ? styles.destructive : null]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </AppScreen>
      </Modal>

      <Modal visible={sharedFilesVisible} animationType="slide" onRequestClose={() => setSharedFilesVisible(false)}>
        <AppScreen horizontalPadding={false} contentContainerStyle={styles.modalBody}>
          <ScreenHeader
            title="Shared Files"
            rightAction={<ScreenHeaderTextButton label="Done" onPress={() => setSharedFilesVisible(false)} />}
          />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {sharedFiles.length === 0 ? (
              <Text style={styles.emptyCopy}>No shared files yet.</Text>
            ) : (
              sharedFiles.map((message) => (
                <View key={message.id} style={styles.fileRow}>
                  <Text style={styles.fileName}>
                    {message.attachments?.[0]?.name ?? message.documentName ?? 'Attachment'}
                  </Text>
                  <Text style={styles.fileMeta}>{message.senderName}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </AppScreen>
      </Modal>
    </>
  );
}

export function ChatSettingsButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <ScreenHeaderIconButton
      icon="⚙"
      accessibilityLabel="Open chat settings"
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  modalBody: {
    flex: 1,
  },
  content: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  actionRow: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  destructive: {
    color: colors.danger,
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
  workingLabel: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  fileRow: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  fileName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  fileMeta: {
    color: colors.muted,
    fontSize: 12,
  },
});
