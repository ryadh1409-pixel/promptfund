import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ScreenHeaderBackButton } from '@/components/layout/ScreenHeader';
import { Card, FieldPreview, LoadingState, PrimaryButton, Screen, ui } from '@/components/ui/Primitives';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { adminService } from '@/services/adminService';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { userService } from '@/services/userService';
import type { User, UserReport } from '@/types/User';
import { safeDate } from '@/utils/safeFormat';

export default function AdminReportReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authUser, profile } = useAuth();
  const [report, setReport] = useState<UserReport | null>(null);
  const [reporter, setReporter] = useState<User | null>(null);
  const [reportedUser, setReportedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const reportId = typeof id === 'string' ? id : '';

  useEffect(() => {
    if (!reportId || profile?.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    adminService.getUserReport(reportId)
      .then(async (nextReport) => {
        if (!isMounted) return;
        if (!nextReport) {
          setNotice('This report is no longer available.');
          return;
        }
        setReport(nextReport);
        const [nextReporter, nextReportedUser] = await Promise.all([
          userService.getUserById(nextReport.reporterUid),
          userService.getUserById(nextReport.reportedUid),
        ]);
        if (!isMounted) return;
        setReporter(nextReporter);
        setReportedUser(nextReportedUser);
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(getFriendlyErrorMessage(error));
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
  }, [profile?.role, reportId]);

  if (!authUser || profile?.role !== 'admin') {
    return <Redirect href="/login" />;
  }

  function confirmAction(message: string) {
    return new Promise<boolean>((resolve) => {
      Alert.alert('Confirm Admin Action', message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  }

  async function runAction(action: () => Promise<void>, successMessage: string, shouldGoBack = false) {
    try {
      setIsWorking(true);
      setNotice(null);
      await action();
      setNotice(successMessage);
      if (shouldGoBack) {
        router.back();
      }
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <Screen
      eyebrow="Admin Moderation"
      title="Review Report"
      subtitle="Review user reports and take moderation action."
      leftAction={<ScreenHeaderBackButton />}
    >
      {isLoading ? <LoadingState label="Loading report" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      {report ? (
        <>
          <Card style={styles.card}>
            <Text style={styles.title}>{report.reason}</Text>
            <View style={styles.grid}>
              <FieldPreview label="Report Time" value={safeDate(report.createdAt)} />
              <FieldPreview label="Status" value={report.status} />
              <FieldPreview label="Reporter" value={reporter?.displayName ?? reporter?.name ?? report.reporterUid} />
              <FieldPreview label="Reported User" value={reportedUser?.displayName ?? reportedUser?.name ?? report.reportedUid} />
              <FieldPreview label="Discussion Room" value={report.discussionRoomId ?? 'Not linked'} />
            </View>
            <Text style={styles.sectionTitle}>Report Details</Text>
            <Text style={styles.body}>{report.details || 'No additional details provided.'}</Text>
            {report.messageId ? (
              <Text style={styles.meta}>Reported message ID: {report.messageId}</Text>
            ) : (
              <Text style={styles.meta}>No specific message attached to this report.</Text>
            )}
          </Card>

          <View style={ui.wrap}>
            <PrimaryButton
              label="Dismiss Report"
              variant="secondary"
              disabled={isWorking}
              onPress={() => runAction(
                () => adminService.dismissReport(report.id, authUser.uid).then(() => undefined),
                'Report dismissed.',
                true,
              )}
            />
            <PrimaryButton
              label="Resolve Report"
              disabled={isWorking}
              onPress={() => runAction(
                () => adminService.resolveReport(report.id, authUser.uid).then(() => undefined),
                'Report resolved.',
                true,
              )}
            />
            <PrimaryButton
              label="Delete Report"
              variant="secondary"
              disabled={isWorking}
              onPress={async () => {
                const confirmed = await confirmAction('Delete this report permanently?');
                if (!confirmed) return;
                await runAction(
                  () => adminService.deleteReport(report.id),
                  'Report deleted.',
                  true,
                );
              }}
            />
            <PrimaryButton
              label="Remove Reported Message"
              variant="secondary"
              disabled={isWorking || !report.messageId}
              onPress={async () => {
                const confirmed = await confirmAction('Remove the reported message from chat?');
                if (!confirmed || !report.messageId) return;
                await runAction(async () => {
                  await adminService.deleteMessage(report.messageId!);
                  await adminService.resolveReport(report.id, authUser.uid);
                }, 'Reported message removed and report resolved.', true);
              }}
            />
            <PrimaryButton
              label="Suspend Reported User"
              variant="secondary"
              disabled={isWorking}
              onPress={async () => {
                const confirmed = await confirmAction('Suspend the reported user?');
                if (!confirmed) return;
                await runAction(async () => {
                  await adminService.updateUserStatus(report.reportedUid, 'suspended');
                  await adminService.resolveReport(report.id, authUser.uid);
                }, 'User suspended and report resolved.', true);
              }}
            />
            <PrimaryButton
              label="Ban Reported User"
              disabled={isWorking}
              onPress={async () => {
                const confirmed = await confirmAction('Permanently ban the reported user?');
                if (!confirmed) return;
                await runAction(async () => {
                  await adminService.updateUserStatus(report.reportedUid, 'banned');
                  await adminService.resolveReport(report.id, authUser.uid);
                }, 'User banned and report resolved.', true);
              }}
            />
            <PrimaryButton
              label="View Reporter Profile"
              variant="secondary"
              onPress={() => router.push(`/admin/user/${report.reporterUid}`)}
            />
            <PrimaryButton
              label="View Reported User Profile"
              variant="secondary"
              onPress={() => router.push(`/admin/user/${report.reportedUid}`)}
            />
            {report.discussionRoomId ? (
              <PrimaryButton
                label="Open Discussion Room"
                variant="secondary"
                onPress={() => router.push(`/discussion-room/${report.discussionRoomId}`)}
              />
            ) : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
  meta: {
    color: colors.subtle,
    lineHeight: 20,
  },
  notice: {
    color: colors.text,
    lineHeight: 22,
  },
});
