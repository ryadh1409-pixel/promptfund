import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { ScreenHeaderBackButton } from '@/components/layout/ScreenHeader';
import { Card, FieldPreview, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { adminService, type AdminUserProfileDetail } from '@/services/adminService';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { getRoleBadgeLabel } from '@/utils/roles';
import { safeCurrency, safeDate } from '@/utils/safeFormat';

export default function AdminUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authUser, profile } = useAuth();
  const [detail, setDetail] = useState<AdminUserProfileDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = typeof id === 'string' ? id : '';

  useEffect(() => {
    if (!userId || profile?.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    adminService.getUserProfileDetail(userId)
      .then((nextDetail) => {
        if (!isMounted) return;
        if (!nextDetail) {
          setError('This user profile is no longer available.');
          return;
        }
        setDetail(nextDetail);
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(getFriendlyErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [profile?.role, userId]);

  if (!authUser || profile?.role !== 'admin') {
    return <Redirect href="/login" />;
  }

  const user = detail?.user;

  return (
    <Screen
      eyebrow="Admin"
      title={user?.displayName ?? user?.name ?? 'User Profile'}
      subtitle="Full account review for moderation and support."
      leftAction={<ScreenHeaderBackButton />}
    >
      {isLoading ? <LoadingState label="Loading user profile" /> : null}
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
          <PrimaryButton label="Back to Admin Dashboard" variant="secondary" onPress={() => router.back()} />
        </Card>
      ) : null}

      {user ? (
        <>
          <Card style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                {user.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials(user.displayName ?? user.name)}</Text>
                )}
              </View>
              <View style={styles.profileCopy}>
                <Text style={styles.displayName}>{user.displayName ?? user.name}</Text>
                <Text style={styles.meta}>@{user.username ?? user.handle}</Text>
                <Text style={styles.meta}>{user.email ?? 'Email unavailable'}</Text>
              </View>
            </View>
            <View style={styles.detailGrid}>
              <FieldPreview label="Role" value={getRoleBadgeLabel(user.role)} />
              <FieldPreview label="Account Status" value={formatStatus(user.status)} />
              <FieldPreview label="Join Date" value={safeDate(user.memberSince ?? user.updatedAt)} />
              <FieldPreview label="Verification" value={user.verified ? 'Verified' : 'Not verified'} />
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Portfolio Companies</Text>
            {detail.portfolioCompanies.length === 0 ? (
              <Text style={styles.meta}>No funded portfolio companies on record.</Text>
            ) : (
              detail.portfolioCompanies.map((investment) => (
                <Text key={investment.id} style={styles.listItem}>
                  {investment.startupName ?? 'Portfolio Company'} · {safeCurrency(investment.fundedAmount ?? investment.amount)}
                </Text>
              ))
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Investments</Text>
            {detail.investments.length === 0 ? (
              <Text style={styles.meta}>No investments on record.</Text>
            ) : (
              detail.investments.map((investment) => (
                <Text key={investment.id} style={styles.listItem}>
                  {investment.startupName ?? 'Investment'} · {investment.status ?? 'active'} · {safeCurrency(investment.fundedAmount ?? investment.amount)}
                </Text>
              ))
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Reports</Text>
            <Text style={styles.meta}>Submitted: {detail.reportsSubmitted.length}</Text>
            <Text style={styles.meta}>Received: {detail.reportsReceived.length}</Text>
            {detail.reportsReceived.slice(0, 5).map((report) => (
              <Text key={report.id} style={styles.listItem}>
                {report.reason} · {report.status} · {safeDate(report.createdAt)}
              </Text>
            ))}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Activity</Text>
            {detail.activity.length === 0 ? (
              <Text style={styles.meta}>No recent activity recorded.</Text>
            ) : (
              detail.activity.slice(0, 8).map((event) => (
                <Text key={event.id} style={styles.listItem}>
                  {event.label} · {safeDate(event.createdAt)}
                </Text>
              ))
            )}
          </Card>
        </>
      ) : null}
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

function formatStatus(status?: string) {
  if (!status || status === 'active') return 'Active';
  if (status === 'suspended') return 'Suspended';
  if (status === 'banned') return 'Banned';
  if (status === 'deleted') return 'Deleted';
  return status;
}

const styles = StyleSheet.create({
  profileCard: {
    gap: spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.luxuryGold,
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  avatarImage: {
    height: 72,
    width: 72,
  },
  avatarText: {
    color: colors.black,
    fontSize: 24,
    fontWeight: '900',
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  displayName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    lineHeight: 22,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  listItem: {
    color: colors.text,
    lineHeight: 22,
  },
  errorText: {
    color: colors.danger,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
});
