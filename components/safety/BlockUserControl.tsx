import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton } from '@/components/ui/Primitives';
import { colors, spacing } from '@/constants/theme';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { userService, type BlockStatus } from '@/services/userService';
import type { User } from '@/types/User';

type BlockUserControlProps = {
  currentUserId?: string | null;
  targetUserId?: string | null;
  currentUser?: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role'> | null;
  targetUser?: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role' | 'photoURL'> | null;
  targetName?: string;
  onStatusChange?: (status: BlockStatus | null) => void;
  onReport?: () => void | Promise<void>;
  showReport?: boolean;
};

const emptyStatus: BlockStatus = {
  blockedByMe: false,
  blockedMe: false,
};

export function BlockUserControl({
  currentUserId,
  targetUserId,
  currentUser,
  targetUser,
  onStatusChange,
  onReport,
  showReport = false,
}: BlockUserControlProps) {
  const [status, setStatus] = useState<BlockStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSelf = Boolean(currentUserId && targetUserId && currentUserId === targetUserId);

  const publishStatus = useCallback((nextStatus: BlockStatus | null) => {
    setStatus(nextStatus);
    onStatusChange?.(nextStatus);
  }, [onStatusChange]);

  useEffect(() => {
    if (!currentUserId || !targetUserId || isSelf) {
      publishStatus(isSelf ? emptyStatus : null);
      return;
    }

    setNotice(null);
    return userService.subscribeBlockStatus(
      currentUserId,
      targetUserId,
      publishStatus,
      (error) => {
        setNotice(getFriendlyErrorMessage(error));
        publishStatus(null);
      },
    );
  }, [currentUserId, isSelf, publishStatus, targetUserId]);

  const handleBlock = useCallback(async () => {
    if (!currentUser || !targetUser || isSelf) {
      return;
    }

    try {
      setIsSaving(true);
      setNotice(null);
      await userService.blockUser({ blocker: currentUser, blocked: targetUser });
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, isSelf, targetUser]);

  const handleUnblock = useCallback(async () => {
    if (!currentUserId || !targetUserId || isSelf) {
      return;
    }

    try {
      setIsSaving(true);
      setNotice(null);
      await userService.unblockUser(currentUserId, targetUserId);
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [currentUserId, isSelf, targetUserId]);

  if (isSelf) {
    return null;
  }

  return (
    <Card>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <View style={styles.actions}>
        {showReport && onReport ? (
          <PrimaryButton label="Report User" variant="secondary" onPress={onReport} disabled={isSaving} />
        ) : null}
        <PrimaryButton
          label={status?.blockedByMe ? 'Unblock User' : 'Block User'}
          variant="secondary"
          onPress={status?.blockedByMe ? handleUnblock : handleBlock}
          disabled={isSaving || status === null || (!status.blockedByMe && (!currentUser || !targetUser))}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  notice: {
    color: colors.danger,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
  },
});
