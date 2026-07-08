import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { ScreenHeaderBackButton } from '@/components/layout/ScreenHeader';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { chatReportService } from '@/services/chat/reportService';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import type { MessageReport, MessageReportStatus } from '@/types/ChatSafety';

type ReportTab = 'pending' | 'reviewed';

export default function AdminReportsScreen() {
  const { authUser, profile } = useAuth();
  const [tab, setTab] = useState<ReportTab>('pending');
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [workingReportId, setWorkingReportId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setNotice(null);
      const nextReports = tab === 'pending'
        ? await chatReportService.listPendingReports()
        : await chatReportService.listReviewedReports();
      setReports(nextReports);
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  if (!authUser || profile?.role !== 'admin') {
    return <Redirect href="/login" />;
  }

  async function handleReportAction(
    report: MessageReport,
    status: MessageReportStatus,
    userAction?: 'suspend' | 'ban',
  ) {
    try {
      setWorkingReportId(report.id);
      setNotice(null);
      await chatReportService.updateReportStatus({
        reportId: report.id,
        status,
        reviewedBy: authUser!.uid,
      });

      if (userAction === 'suspend') {
        await chatReportService.suspendUser(report.reportedUserId, authUser!.uid);
      }
      if (userAction === 'ban') {
        await chatReportService.permanentlyBanUser(report.reportedUserId, authUser!.uid);
      }

      await loadReports();
      setNotice(`Report ${status}.`);
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setWorkingReportId(null);
    }
  }

  return (
    <Screen
      eyebrow="Admin"
      title="Chat Reports"
      subtitle="Review message reports and take moderation action."
      leftAction={<ScreenHeaderBackButton />}
    >
      <View style={styles.tabRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTab('pending')}
          style={[styles.tab, tab === 'pending' ? styles.tabActive : null]}
        >
          <Text style={[styles.tabLabel, tab === 'pending' ? styles.tabLabelActive : null]}>Pending</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTab('reviewed')}
          style={[styles.tab, tab === 'reviewed' ? styles.tabActive : null]}
        >
          <Text style={[styles.tabLabel, tab === 'reviewed' ? styles.tabLabelActive : null]}>Reviewed</Text>
        </Pressable>
      </View>

      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      {!isLoading && reports.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No {tab} reports</Text>
          <Text style={styles.emptyCopy}>Message reports from investment chats will appear here.</Text>
        </Card>
      ) : null}

      <ScrollView contentContainerStyle={styles.list}>
        {reports.map((report) => (
          <Card key={report.id} style={styles.reportCard}>
            <Text style={styles.reportReason}>{report.reason}</Text>
            <Text style={styles.reportMeta}>Room: {report.roomId}</Text>
            <Text style={styles.reportMeta}>Message: {report.messageId}</Text>
            <Text style={styles.reportMeta}>Reported user: {report.reportedUserId}</Text>
            <Text style={styles.reportMeta}>Reporter: {report.reporterId}</Text>
            <Text style={styles.reportMeta}>Status: {report.status}</Text>
            {report.details ? <Text style={styles.reportDetails}>{report.details}</Text> : null}

            {tab === 'pending' ? (
              <View style={styles.actions}>
                <PrimaryButton
                  label={workingReportId === report.id ? 'Working...' : 'Approve'}
                  onPress={() => handleReportAction(report, 'approved')}
                  disabled={workingReportId === report.id}
                />
                <PrimaryButton
                  label="Dismiss"
                  variant="secondary"
                  onPress={() => handleReportAction(report, 'dismissed')}
                  disabled={workingReportId === report.id}
                />
                <PrimaryButton
                  label="Suspend User"
                  variant="secondary"
                  onPress={() => handleReportAction(report, 'reviewed', 'suspend')}
                  disabled={workingReportId === report.id}
                />
                <PrimaryButton
                  label="Permanently Ban"
                  onPress={() => handleReportAction(report, 'approved', 'ban')}
                  disabled={workingReportId === report.id}
                />
              </View>
            ) : null}
          </Card>
        ))}
      </ScrollView>

      <PrimaryButton label="Back to Admin Dashboard" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tab: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  tabActive: {
    backgroundColor: 'rgba(200, 162, 74, 0.16)',
    borderColor: colors.accent,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.accent,
  },
  notice: {
    color: colors.text,
    lineHeight: 21,
  },
  loading: {
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyCopy: {
    color: colors.muted,
    lineHeight: 21,
  },
  list: {
    gap: spacing.md,
  },
  reportCard: {
    gap: spacing.sm,
  },
  reportReason: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  reportMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  reportDetails: {
    color: colors.text,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
