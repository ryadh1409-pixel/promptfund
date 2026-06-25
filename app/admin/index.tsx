import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, LoadingState, PrimaryButton, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { adminService } from '@/services/adminService';
import type { AgreementRoom } from '@/types/Agreement';
import type { InvestmentInterest, Match } from '@/types/FundingRequest';
import type { Project } from '@/types/Project';
import type { ModerationFlag, User, UserReport, BlockedUser, ActivityTimelineEvent } from '@/types/User';
import type { DiscussionRoom, InvestmentAgreement, InvestmentOpportunity, StartupInterest, V5Investment } from '@/types/InvestmentFlow';
import { formatCurrency } from '@/utils/format';
import { getRoleBadgeLabel } from '@/utils/roles';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { buildDealPipelines, getPipelineStageMeta } from '@/utils/investmentPipeline';
import { safeDate, safePercent } from '@/utils/safeFormat';

type AdminData = {
  users: User[];
  projects: Project[];
  investments: V5Investment[];
  matches: Match[];
  agreements: AgreementRoom[];
  investmentAgreements: InvestmentAgreement[];
  startupOpportunities: InvestmentOpportunity[];
  interests: StartupInterest[];
  discussionRooms: DiscussionRoom[];
  reports: UserReport[];
  blockedUsers: BlockedUser[];
  moderationFlags: ModerationFlag[];
  activityTimeline: ActivityTimelineEvent[];
  revenue: number;
  portfolioVolume: number;
};

type AdminFilter = 'all' | 'active' | 'completed' | 'reported' | 'blocked' | 'archived';

export default function AdminDashboardScreen() {
  const { authUser, initializing, profile } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AdminFilter>('active');
  const [search, setSearch] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');

  useEffect(() => {
    async function loadAdminData() {
      if (profile?.role !== 'admin') {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        setData(await adminService.getDashboardData());
      } catch (loadError) {
        setError(getFriendlyErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminData();
  }, [profile?.role]);

  if (!initializing && !authUser) {
    return <Redirect href="/login" />;
  }

  if (!initializing && profile && profile.role !== 'admin') {
    return <Redirect href="/profile" />;
  }

  async function handleUserStatus(userId: string, status: 'suspended' | 'banned') {
    const confirmed = await confirmAction(`${status === 'banned' ? 'Block' : 'Suspend'} this user?`);
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      await adminService.updateUserStatus(userId, status);
      setData(await adminService.getDashboardData());
    } catch (statusError) {
      setError(getFriendlyErrorMessage(statusError));
    }
  }

  async function handleProjectStatus(projectId: string, status: Project['status']) {
    try {
      setError(null);
      await adminService.updateProjectStatus(projectId, status);
      setData(await adminService.getDashboardData());
    } catch (projectError) {
      setError(getFriendlyErrorMessage(projectError));
    }
  }

  async function handleStartupStatus(startupId: string, status: InvestmentOpportunity['status']) {
    const confirmed = await confirmAction(`Set this startup to ${status}?`);
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      await adminService.updateStartupStatus(startupId, status);
      setData(await adminService.getDashboardData());
    } catch (startupError) {
      setError(getFriendlyErrorMessage(startupError));
    }
  }

  async function handleDeleteStartup(startupId: string) {
    const confirmed = await confirmAction('Delete this startup? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      await adminService.deleteStartup(startupId);
      setData(await adminService.getDashboardData());
    } catch (deleteError) {
      setError(getFriendlyErrorMessage(deleteError));
    }
  }

  async function handleSendAnnouncement() {
    if (!authUser || !announcementTitle.trim() || !announcementBody.trim()) {
      return;
    }

    try {
      setError(null);
      await adminService.sendAnnouncement({
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
        target: 'everyone',
        sentBy: authUser.uid,
      });
      setAnnouncementTitle('');
      setAnnouncementBody('');
    } catch (announcementError) {
      setError(getFriendlyErrorMessage(announcementError));
    }
  }

  async function handleResolveReport(reportId: string) {
    try {
      setError(null);
      await adminService.resolveReport(reportId);
      setData(await adminService.getDashboardData());
    } catch (reportError) {
      setError(getFriendlyErrorMessage(reportError));
    }
  }

  return (
    <Screen eyebrow="Admin" title="PromptFund Admin Dashboard" subtitle="Private operations console for trusted administrators.">
      {isLoading || !data ? <LoadingState label="Loading admin dashboard" /> : null}
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      {data ? (
        <>
          <View style={ui.row}>
            <StatCard label="Users" value={String(data.users.length)} tone={colors.accent} />
            <StatCard label="Active Startups" value={String(data.startupOpportunities.filter((startup) => startup.status !== 'completed' && startup.status !== 'archived').length)} tone={colors.luxuryGold} />
          </View>
          <View style={ui.row}>
            <StatCard label="Completed" value={String(data.investments.length)} />
            <StatCard label="Open Reports" value={String(data.reports.filter((report) => report.status === 'open').length)} tone={colors.danger} />
          </View>

          <AdminSection title="Startup Pipeline">
            <View style={ui.wrap}>
              {(['all', 'active', 'completed', 'reported', 'blocked', 'archived'] as AdminFilter[]).map((item) => (
                <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item ? styles.filterChipActive : null]}>
                  <Text style={styles.filterText}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              placeholder="Search by founder, investor, or startup"
              placeholderTextColor={colors.subtle}
              value={search}
              onChangeText={setSearch}
              style={styles.input}
            />
            {buildAdminPipelines(data, search, filter).map((item) => (
              <AdminStartupCard
                key={item.pipeline.id}
                item={item}
                onArchive={() => handleStartupStatus(item.pipeline.id, 'archived')}
                onFreeze={() => handleStartupStatus(item.pipeline.id, 'frozen')}
                onSuspend={() => handleStartupStatus(item.pipeline.id, 'suspended')}
                onRestore={() => handleStartupStatus(item.pipeline.id, 'active')}
                onOpenDiscussion={() => item.pipeline.room ? router.push(`/discussion-room/${item.pipeline.room.id}`) : undefined}
                onBlockFounder={() => item.pipeline.opportunity?.founderId ? handleUserStatus(item.pipeline.opportunity.founderId, 'banned') : undefined}
                onBlockInvestor={() => item.pipeline.room?.investorId ? handleUserStatus(item.pipeline.room.investorId, 'banned') : undefined}
                onDelete={() => handleDeleteStartup(item.pipeline.id)}
                onViewTimeline={() => router.push(`/admin`)}
              />
            ))}
          </AdminSection>

          <AdminSection title="Reports">
            {data.reports.slice(0, 10).map((report) => (
              <Card key={report.id}>
                <Text style={styles.itemTitle}>{report.reason}</Text>
                <Text style={styles.itemMeta}>{report.reportedUid} · {report.status} · {safeDate(report.createdAt)}</Text>
                <Text style={styles.itemMeta}>{report.details}</Text>
                <PrimaryButton label="Review / Resolve Report" variant="secondary" onPress={() => handleResolveReport(report.id)} />
              </Card>
            ))}
          </AdminSection>

          <AdminSection title="Moderation Flags">
            {data.moderationFlags.slice(0, 10).map((flag) => (
              <Card key={flag.id}>
                <Text style={styles.itemTitle}>{flag.categories.join(', ')}</Text>
                <Text style={styles.itemMeta}>{flag.userId} · {flag.status}</Text>
                <Text style={styles.itemMeta}>{flag.messagePreview}</Text>
              </Card>
            ))}
          </AdminSection>

          <AdminSection title="Announcement Center">
            <Card>
              <TextInput placeholder="Announcement title" placeholderTextColor={colors.subtle} value={announcementTitle} onChangeText={setAnnouncementTitle} style={styles.input} />
              <TextInput placeholder="Announcement body" placeholderTextColor={colors.subtle} value={announcementBody} onChangeText={setAnnouncementBody} multiline style={[styles.input, styles.textArea]} />
              <PrimaryButton label="Send Announcement To Everyone" onPress={handleSendAnnouncement} disabled={!announcementTitle.trim() || !announcementBody.trim()} />
            </Card>
          </AdminSection>

          <AdminSection title="Users">
            {data.users.slice(0, 8).map((user) => (
              <Card key={user.id}>
                <Text style={styles.itemTitle}>{user.displayName ?? user.name}</Text>
                <Text style={styles.itemMeta}>{user.username ?? user.handle} · {user.status ?? 'active'} · {getRoleBadgeLabel(user.role)}</Text>
                <View style={ui.wrap}>
                  <PrimaryButton label="View User Profile" variant="secondary" onPress={() => undefined} />
                  <PrimaryButton label="Suspend User" variant="secondary" onPress={() => handleUserStatus(user.id, 'suspended')} />
                  <PrimaryButton label="Block User" variant="secondary" onPress={() => handleUserStatus(user.id, 'banned')} />
                </View>
              </Card>
            ))}
          </AdminSection>
        </>
      ) : null}
    </Screen>
  );
}

function confirmAction(message: string) {
  return new Promise<boolean>((resolve) => {
    Alert.alert('Confirm Admin Action', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

function mapStartupInterestToLegacy(interest: StartupInterest): InvestmentInterest {
  return {
    id: interest.id,
    startupId: interest.startupOpportunityId,
    investorId: interest.investorId,
    founderUid: interest.founderId,
    createdAt: interest.createdAt,
    status: interest.status === 'discussion' ? 'accepted' : interest.status,
  };
}

function buildAdminPipelines(data: AdminData, search: string, filter: AdminFilter) {
  const opportunities = Object.fromEntries(data.startupOpportunities.map((startup) => [startup.id, startup]));
  const pipelines = buildDealPipelines({
    founderCards: data.startupOpportunities,
    interests: data.interests.map(mapStartupInterestToLegacy),
    matches: data.matches,
    discussionRooms: data.discussionRooms,
    agreements: data.investmentAgreements,
    investments: data.investments,
    opportunities,
    includeFounderCards: true,
  });
  const blockedUids = new Set(data.blockedUsers.flatMap((block) => [block.blockerUid, block.blockedUid]));
  const reportCounts = new Map<string, number>();
  data.reports.forEach((report) => {
    if (report.startupId) {
      reportCounts.set(report.startupId, (reportCounts.get(report.startupId) ?? 0) + 1);
    }
  });
  const normalizedSearch = search.trim().toLowerCase();

  return pipelines
    .map((pipeline) => ({
      pipeline,
      stage: getPipelineStageMeta(pipeline),
      reportCount: reportCounts.get(pipeline.id) ?? 0,
      lastActivity: pipeline.agreement?.updatedAt ?? pipeline.room?.updatedAt ?? pipeline.opportunity?.createdAt,
      isBlocked: blockedUids.has(pipeline.opportunity?.founderId ?? '') || blockedUids.has(pipeline.room?.investorId ?? ''),
      timeline: data.activityTimeline
        .filter((event) => event.startupId === pipeline.id || event.discussionRoomId === pipeline.room?.id || event.agreementId === pipeline.agreement?.id)
        .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))),
    }))
    .filter((item) => {
      if (filter === 'completed' && item.pipeline.currentStep !== 'completed') return false;
      if (filter === 'archived' && item.pipeline.opportunity?.status !== 'archived') return false;
      if (filter === 'reported' && item.reportCount === 0) return false;
      if (filter === 'blocked' && !item.isBlocked) return false;
      if (filter === 'active' && item.pipeline.currentStep === 'completed') return false;

      if (!normalizedSearch) return true;
      const haystack = [
        item.pipeline.opportunity?.startupName,
        item.pipeline.opportunity?.founderName,
        item.pipeline.room?.investorName,
        item.pipeline.agreement?.investorName,
      ].join(' ').toLowerCase();
      return haystack.includes(normalizedSearch);
    });
}

function AdminStartupCard({
  item,
  onArchive,
  onFreeze,
  onSuspend,
  onRestore,
  onOpenDiscussion,
  onBlockFounder,
  onBlockInvestor,
  onDelete,
  onViewTimeline,
}: {
  item: ReturnType<typeof buildAdminPipelines>[number];
  onArchive: () => void;
  onFreeze: () => void;
  onSuspend: () => void;
  onRestore: () => void;
  onOpenDiscussion: () => void;
  onBlockFounder: () => void;
  onBlockInvestor: () => void;
  onDelete: () => void;
  onViewTimeline: () => void;
}) {
  const pipeline = item.pipeline;
  const startup = pipeline.opportunity;
  const founder = startup?.founderName ?? pipeline.agreement?.founderName ?? 'Founder';
  const investor = pipeline.room?.investorName ?? pipeline.agreement?.investorName ?? 'Angel Investor';
  const amount = pipeline.agreement?.investmentAmount ?? pipeline.room?.investmentAmount ?? startup?.fundingNeeded ?? 0;
  const equity = pipeline.agreement?.investorAllocation ?? pipeline.room?.investorAllocation ?? startup?.investorAllocation ?? 0;

  return (
    <Card>
      <Text style={styles.itemTitle}>{startup?.startupName ?? pipeline.agreement?.startupName ?? 'Startup'}</Text>
      <Text style={[styles.stageText, { color: item.stage.badgeColor }]}>{item.stage.badge}</Text>
      <Text style={styles.itemMeta}>Founder: {founder}</Text>
      <Text style={styles.itemMeta}>Angel Investor: {investor}</Text>
      <Text style={styles.itemMeta}>Funding: {formatCurrency(amount)} · Equity: {safePercent(equity)}</Text>
      <Text style={styles.itemMeta}>Created: {safeDate(startup?.createdAt)} · Last activity: {safeDate(item.lastActivity)}</Text>
      <Text style={styles.itemMeta}>Reports: {item.reportCount}</Text>
      <Text style={styles.itemMeta}>Current Status: {startup?.status ?? pipeline.agreement?.status ?? 'active'}</Text>
      {item.timeline.length > 0 ? (
        <View style={styles.timelineBox}>
          <Text style={styles.timelineTitle}>Timeline History</Text>
          {item.timeline.slice(0, 5).map((event) => (
            <Text key={event.id} style={styles.itemMeta}>• {event.label} · {safeDate(event.createdAt)}</Text>
          ))}
        </View>
      ) : null}
      <View style={ui.wrap}>
        <PrimaryButton label="View Deal" variant="secondary" onPress={onOpenDiscussion} />
        <PrimaryButton label="Open Discussion Room" variant="secondary" onPress={onOpenDiscussion} />
        <PrimaryButton label="Archive Startup" variant="secondary" onPress={onArchive} />
        <PrimaryButton label="Freeze Startup" variant="secondary" onPress={onFreeze} />
        <PrimaryButton label="Suspend Startup" variant="secondary" onPress={onSuspend} />
        <PrimaryButton label="Restore Startup" variant="secondary" onPress={onRestore} />
        <PrimaryButton label="Block Founder" variant="secondary" onPress={onBlockFounder} />
        <PrimaryButton label="Block Investor" variant="secondary" onPress={onBlockInvestor} />
        <PrimaryButton label="Delete Startup" variant="secondary" onPress={onDelete} />
        <PrimaryButton label="View Timeline History" variant="secondary" onPress={onViewTimeline} />
      </View>
    </Card>
  );
}

function AdminSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  itemTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  itemMeta: {
    color: colors.muted,
    lineHeight: 22,
  },
  stageText: {
    fontSize: 13,
    fontWeight: '900',
  },
  timelineBox: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.18)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.black,
  },
  timelineTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  filterChip: {
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.black,
  },
  filterChipActive: {
    borderColor: colors.luxuryGold,
    backgroundColor: 'rgba(200, 162, 74, 0.16)',
  },
  filterText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
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
  textArea: {
    minHeight: 120,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.danger,
    lineHeight: 22,
  },
});
