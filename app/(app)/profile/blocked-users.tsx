import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { userService } from '@/services/userService';
import type { BlockedUser } from '@/types/User';
import { safeDate } from '@/utils/safeFormat';

export default function BlockedUsersScreen() {
  const { authUser } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser?.uid) {
      setBlockedUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    return userService.subscribeBlockedUsers(
      authUser.uid,
      (blocks) => {
        setBlockedUsers(blocks);
        setIsLoading(false);
      },
      (loadError) => {
        setError(getFriendlyErrorMessage(loadError));
        setIsLoading(false);
      },
    );
  }, [authUser?.uid]);

  async function handleUnblock(blocked: BlockedUser) {
    if (!authUser?.uid) {
      return;
    }

    try {
      setError(null);
      await userService.unblockUser(authUser.uid, blocked.blockedUid);
    } catch (unblockError) {
      setError(getFriendlyErrorMessage(unblockError));
    }
  }

  return (
    <Screen eyebrow="Safety" title="Blocked Users" subtitle="Blocked users cannot message, invest, search, or interact with you.">
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}
      {isLoading ? <LoadingState label="Loading blocked users" /> : null}
      {!isLoading && blockedUsers.length === 0 ? (
        <EmptyState title="No blocked users" message="Users you block from profiles or Investment Chat will appear here." />
      ) : null}
      {blockedUsers.map((blocked) => (
        <Card key={blocked.id} style={styles.userCard}>
          <View style={styles.userRow}>
            {blocked.blockedPhotoURL ? (
              <Image source={{ uri: blocked.blockedPhotoURL }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials(blocked.blockedName ?? blocked.blockedUid)}</Text>
              </View>
            )}
            <View style={styles.userMeta}>
              <Text style={styles.title}>{blocked.blockedName ?? blocked.blockedUid}</Text>
              <Text style={styles.copy}>{blocked.blockedRole ?? 'Ai PromptFund Member'}</Text>
              <Text style={styles.copy}>Blocked on {safeDate(blocked.createdAt)}</Text>
            </View>
          </View>
          <PrimaryButton label="Unblock" variant="secondary" onPress={() => handleUnblock(blocked)} />
        </Card>
      ))}
    </Screen>
  );
}

function initials(value?: string) {
  return value
    ?.split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PF';
}

const styles = StyleSheet.create({
  userCard: {
    gap: spacing.md,
  },
  userRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.panelMuted,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.luxuryGold,
  },
  avatarText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '900',
  },
  userMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  copy: {
    color: colors.muted,
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
});
