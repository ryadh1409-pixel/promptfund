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

import { colors, radii, spacing } from '@/constants/theme';
import { chatBlockService } from '@/services/chat/blockService';
import { chatMuteService } from '@/services/chat/muteService';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
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
  onBlocked?: () => void;
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
  onBlocked,
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

  const isMuted = chatMuteService.isConversationMuted(room, currentUser.id);

  async function runAction(action: () => Promise<void>, successMessage: string) {
    try {
      setIsWorking(true);
      await action();
      onToast({ type: 'success', message: successMessage });
      onClose();
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
            () => chatMuteService.muteConversation(room.id, currentUser.id, option.value),
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
                () => chatMuteService.muteConversation(room.id, currentUser.id, option.value),
                'Conversation muted.',
              );
            },
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      });
    }
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
      label: 'Block User',
      destructive: true,
      onPress: () => {
        if (!counterparty) return;
        void runAction(async () => {
          await chatBlockService.blockUser({ blocker: currentUser, blocked: counterparty });
          onBlocked?.();
        }, 'User blocked.');
      },
    },
    {
      label: isMuted ? 'Unmute Conversation' : 'Mute Conversation',
      onPress: () => {
        if (isMuted) {
          void runAction(
            () => chatMuteService.unmuteConversation(room.id, currentUser.id),
            'Conversation unmuted.',
          );
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
  ];

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chat Settings</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close chat settings" onPress={onClose}>
              <Text style={styles.close}>Done</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
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
        </View>
      </Modal>

      <Modal visible={sharedFilesVisible} animationType="slide" onRequestClose={() => setSharedFilesVisible(false)}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Shared Files</Text>
            <Pressable accessibilityRole="button" onPress={() => setSharedFilesVisible(false)}>
              <Text style={styles.close}>Done</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
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
        </View>
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open chat settings"
      onPress={onPress}
      style={styles.settingsButton}
    >
      <Text style={styles.settingsIcon}>⚙</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: 'rgba(216, 201, 163, 0.18)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  close: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    gap: spacing.sm,
    padding: spacing.lg,
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
  settingsButton: {
    alignItems: 'center',
    backgroundColor: colors.panelMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  settingsIcon: {
    color: colors.accent,
    fontSize: 18,
    lineHeight: 20,
  },
});
