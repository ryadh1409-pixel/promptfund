import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ReportDialog } from '@/components/chat/ReportDialog';
import { colors, radii, spacing } from '@/constants/theme';
import { chatBlockService } from '@/services/chat/blockService';
import { chatMessageService } from '@/services/chat/messageService';
import { chatReportService } from '@/services/chat/reportService';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import type { MessageReportReason, ChatToastPayload } from '@/types/ChatSafety';
import type { ChatMessage } from '@/types/InvestmentChat';
import type { User } from '@/types/User';
import { copyTextToClipboard } from '@/utils/chatClipboard';
import { showNativeActionSheet } from '@/utils/nativeActionSheet';

type UseMessageActionsOptions = {
  roomId: string;
  currentUser: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role'>;
  counterparty: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role' | 'photoURL'> | null;
  onToast: (payload: ChatToastPayload) => void;
  onBlocked?: () => void;
};

function getMessageCopyText(message: ChatMessage) {
  return message.text?.trim() || message.body?.trim() || message.attachments?.[0]?.name || '';
}

export function useMessageActions({
  roomId,
  currentUser,
  counterparty,
  onToast,
  onBlocked,
}: UseMessageActionsOptions) {
  const [reportMessage, setReportMessage] = useState<ChatMessage | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [androidSheetVisible, setAndroidSheetVisible] = useState(false);
  const [androidActions, setAndroidActions] = useState<Array<{ label: string; destructive?: boolean; onPress: () => void }>>([]);

  const copyMessage = useCallback(async (message: ChatMessage) => {
    const text = getMessageCopyText(message);
    if (!text) {
      onToast({ type: 'info', message: 'Nothing to copy for this message.' });
      return;
    }

    const copied = await copyTextToClipboard(text);
    if (!copied) {
      onToast({ type: 'info', message: 'Copy is unavailable on this device.' });
      return;
    }

    onToast({ type: 'success', message: 'Message copied.' });
  }, [onToast]);

  const deleteMessage = useCallback(async (message: ChatMessage) => {
    try {
      await chatMessageService.softDeleteMessage(message, currentUser.id);
      onToast({ type: 'success', message: 'Message deleted.' });
    } catch (error) {
      onToast({ type: 'error', message: getFriendlyErrorMessage(error) });
    }
  }, [currentUser.id, onToast]);

  const blockCounterparty = useCallback(async () => {
    if (!counterparty) return;
    try {
      await chatBlockService.blockUser({ blocker: currentUser, blocked: counterparty });
      onToast({ type: 'success', message: 'User blocked.' });
      onBlocked?.();
    } catch (error) {
      onToast({ type: 'error', message: getFriendlyErrorMessage(error) });
    }
  }, [counterparty, currentUser, onBlocked, onToast]);

  const submitReport = useCallback(async ({
    reason,
    details,
  }: {
    reason: MessageReportReason;
    details?: string;
  }) => {
    if (!reportMessage) return;
    try {
      setIsReporting(true);
      const result = await chatReportService.submitMessageReport({
        reporterId: currentUser.id,
        reportedUserId: reportMessage.senderId,
        roomId,
        messageId: reportMessage.id,
        reason,
        details,
      });
      setReportMessage(null);
      onToast({
        type: 'success',
        message: result.alreadyExists
          ? 'You have already reported this message.'
          : 'Report submitted. Thank you for helping keep Ai PromptFund safe.',
      });
    } catch (error) {
      onToast({ type: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setIsReporting(false);
    }
  }, [currentUser.id, onToast, reportMessage, roomId]);

  const openActions = useCallback((message: ChatMessage) => {
    if (message.deleted || message.deletedAt || message.type === 'system') return;

    const isOwn = message.senderId === currentUser.id;
    const actions = isOwn
      ? [
          { label: 'Copy', onPress: () => { void copyMessage(message); } },
          { label: 'Delete', destructive: true, onPress: () => { void deleteMessage(message); } },
        ]
      : [
          { label: 'Copy', onPress: () => { void copyMessage(message); } },
          { label: 'Report', onPress: () => setReportMessage(message) },
          { label: 'Block User', destructive: true, onPress: () => { void blockCounterparty(); } },
        ];

    const usedNativeSheet = showNativeActionSheet({
      title: 'Message actions',
      options: actions,
    });

    if (!usedNativeSheet) {
      setAndroidActions(actions);
      setAndroidSheetVisible(true);
    }
  }, [blockCounterparty, copyMessage, deleteMessage, currentUser.id]);

  const reportDialog = (
    <ReportDialog
      visible={Boolean(reportMessage)}
      isSubmitting={isReporting}
      onClose={() => setReportMessage(null)}
      onSubmit={submitReport}
    />
  );

  const androidActionSheet = (
    <Modal visible={androidSheetVisible} transparent animationType="slide" onRequestClose={() => setAndroidSheetVisible(false)}>
      <Pressable style={styles.sheetBackdrop} onPress={() => setAndroidSheetVisible(false)}>
        <View style={styles.sheetCard}>
          <Text style={styles.sheetTitle}>Message actions</Text>
          {androidActions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => {
                setAndroidSheetVisible(false);
                action.onPress();
              }}
              style={styles.sheetAction}
            >
              <Text style={[styles.sheetActionLabel, action.destructive ? styles.sheetActionDestructive : null]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setAndroidSheetVisible(false)} style={styles.sheetCancel}>
            <Text style={styles.sheetCancelLabel}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );

  return {
    openMessageActions: openActions,
    reportDialog,
    androidActionSheet,
    isReporting,
  };
}

export function ChatToastBanner({ toast }: { toast: ChatToastPayload | null }) {
  if (!toast) return null;

  const tone = toast.type === 'error' ? colors.danger : toast.type === 'success' ? colors.success : colors.accent;
  return (
    <View style={[styles.toast, { borderColor: tone }]}>
      <Text style={[styles.toastText, { color: tone }]}>{toast.message}</Text>
    </View>
  );
}

export function ChatLoadingOverlay({ visible, label = 'Working...' }: { visible: boolean; label?: string }) {
  if (!visible) return null;
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  sheetTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  sheetAction: {
    paddingVertical: spacing.md,
  },
  sheetActionLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  sheetActionDestructive: {
    color: colors.danger,
  },
  sheetCancel: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  },
  sheetCancelLabel: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  toast: {
    backgroundColor: colors.panel,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
