import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Card, EmptyState, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { userService } from '@/services/userService';
import type { BlockedUser } from '@/types/User';

export default function BlockedUsersScreen() {
  const { authUser } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedUid, setBlockedUid] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBlockedUsers() {
      if (!authUser) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        setBlockedUsers(await userService.listBlockedUsers(authUser.uid));
      } catch (loadError) {
        setError(getFriendlyErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    loadBlockedUsers();
  }, [authUser]);

  async function handleBlockUser() {
    if (!authUser || !blockedUid.trim()) {
      return;
    }

    try {
      setError(null);
      const blocked = await userService.blockUser(authUser.uid, blockedUid.trim());
      setBlockedUsers((items) => [blocked, ...items]);
      setBlockedUid('');
    } catch (blockError) {
      setError(getFriendlyErrorMessage(blockError));
    }
  }

  return (
    <Screen eyebrow="Safety" title="Blocked Users" subtitle="Blocked users cannot message, invest, search, or interact with you.">
      <Card>
        <TextInput placeholder="User UID to block" placeholderTextColor={colors.subtle} value={blockedUid} onChangeText={setBlockedUid} autoCapitalize="none" style={styles.input} />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label="Block User" disabled={blockedUid.trim().length === 0} onPress={handleBlockUser} />
      </Card>

      {isLoading ? <LoadingState label="Loading blocked users" /> : null}
      {!isLoading && blockedUsers.length === 0 ? (
        <EmptyState title="No blocked users" message="Your safety controls are clean." />
      ) : null}
      {blockedUsers.map((blocked) => (
        <Card key={blocked.id}>
          <Text style={styles.title}>{blocked.blockedUid}</Text>
          <Text style={styles.copy}>Blocked on {new Date(blocked.createdAt).toLocaleDateString()}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.36)',
    borderRadius: radii.md,
    backgroundColor: colors.panelMuted,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
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
