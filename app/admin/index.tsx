import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminInvestmentChats } from '@/components/admin/AdminInvestmentChats';
import { ScreenHeaderBackButton } from '@/components/layout/ScreenHeader';
import { Card, LoadingState, PrimaryButton, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { adminService, isUserBlocked } from '@/services/adminService';
import type { AgreementRoom } from '@/types/Agreement';
import type { InvestmentInterest, Match } from '@/types/FundingRequest';
import type { Project } from '@/types/Project';
import type { ModerationFlag, SupportTicket, User, UserReport, ActivityTimelineEvent, UserStatus } from '@/types/User';
import type { ChatMessage } from '@/types/InvestmentChat';
import type { DiscussionRoom, InvestmentAgreement, InvestmentOpportunity, StartupInterest, V5Investment } from '@/types/InvestmentFlow';
import { formatCurrency } from '@/utils/format';
import { getRoleBadgeLabel } from '@/utils/roles';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { normalizeChatMessage } from '@/services/investmentChatService';
import { buildDealPipelines, getPipelineDiscussionRoomId, getPipelineStageMeta } from '@/utils/investmentPipeline';
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
  moderationFlags: ModerationFlag[];
  activityTimeline: ActivityTimelineEvent[];
  supportTickets: SupportTicket[];
  revenue: number;
  portfolioVolume: number;
};

type AdminFilter = 'all' | 'active' | 'completed' | 'reported' | 'blocked' | 'archived';
type AdminToast = { type: 'success' | 'error'; message: string };

export default function AdminDashboardScreen() {
  const { authUser, initializing, profile } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<AdminToast | null>(null);
  const [workingKeys, setWorkingKeys] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<AdminFilter>('active');
  const [search, setSearch] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [announcementNotice, setAnnouncementNotice] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const usersById = useMemo(
    () => Object.fromEntries((data?.users ?? []).map((user) => [user.id, user])),
    [data?.users],
  );

  const showToast = useCallback((type: AdminToast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const runAdminAction = useCallback(async (
    key: string,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    try {
      setWorkingKeys((current) => new Set(current).add(key));
      setError(null);
      await action();
      showToast('success', successMessage);
    } catch (actionError) {
      const message = getFriendlyErrorMessage(actionError);
      setError(message);
      showToast('error', message);
      throw actionError;
    } finally {
      setWorkingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }, [showToast]);

  const updateUserInData = useCallback((userId: string, status: UserStatus) => {
    setData((current) => (
      current
        ? {
          ...current,
          users: current.users.map((user) => (
            user.id === userId ? { ...user, status } : user
          )),
        }
        : current
    ));
  }, []);

  const removeStartupFromData = useCallback((startupId: string) => {
    const roomIds = new Set(
      (data?.discussionRooms ?? [])
        .filter((room) => room.opportunityId === startupId || room.startupOpportunityId === startupId)
        .map((room) => room.id),
    );

    setData((current) => {
      if (!current) return current;

      const agreementIds = new Set(
        current.investmentAgreements
          .filter((agreement) => agreement.opportunityId === startupId)
          .map((agreement) => agreement.id),
      );

      return {
        ...current,
        startupOpportunities: current.startupOpportunities.filter((startup) => startup.id !== startupId),
        projects: current.projects.filter((project) => project.id !== startupId),
        interests: current.interests.filter((interest) => interest.startupOpportunityId !== startupId),
        matches: current.matches.filter((match) => match.startupId !== startupId),
        discussionRooms: current.discussionRooms.filter((room) => !roomIds.has(room.id)),
        investmentAgreements: current.investmentAgreements.filter((agreement) => agreement.opportunityId !== startupId),
        investments: current.investments.filter((investment) => (
          investment.opportunityId !== startupId
          && investment.startupId !== startupId
          && investment.projectId !== startupId
        )),
        reports: current.reports.filter((report) => report.startupId !== startupId),
        moderationFlags: current.moderationFlags.filter((flag) => (
          flag.discussionRoomId ? !roomIds.has(flag.discussionRoomId) : true
        )),
        activityTimeline: current.activityTimeline.filter((event) => (
          event.startupId !== startupId
          && (event.discussionRoomId ? !roomIds.has(event.discussionRoomId) : true)
          && (event.agreementId ? !agreementIds.has(event.agreementId) : true)
        )),
      };
    });

    setChatMessages((current) => current.filter((message) => {
      const roomId = message.roomId ?? message.discussionRoomId;
      return roomId ? !roomIds.has(roomId) : true;
    }));
  }, [data?.discussionRooms]);

  useEffect(() => {
    async function loadAdminData() {
      if (profile?.role !== 'admin') {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const nextData = await adminService.getDashboardData();
        const rawMessages = await adminService.listDiscussionMessages();
        setData(nextData);
        setChatMessages(rawMessages.map((message) => normalizeChatMessage(message.id, message as unknown as Record<string, unknown>)));
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

  async function handleSuspendUser(userId: string) {
    const confirmed = await confirmAction('Suspend this user?');
    if (!confirmed) return;

    await runAdminAction(`suspend:${userId}`, async () => {
      await adminService.updateUserStatus(userId, 'suspended');
      updateUserInData(userId, 'suspended');
    }, 'User suspended.');
  }

  async function handleToggleBlockUser(userId: string) {
    const user = usersById[userId];
    const blocked = isUserBlocked(user);
    const confirmed = await confirmAction(
      blocked ? 'Unblock this user and restore account access?' : 'Block this user from Ai PromptFund?',
    );
    if (!confirmed) return;

    await runAdminAction(`block:${userId}`, async () => {
      if (blocked) {
        await adminService.unblockUserAccount(userId);
        updateUserInData(userId, 'active');
      } else {
        await adminService.blockUserAccount(userId);
        updateUserInData(userId, 'banned');
      }
    }, blocked ? 'User unblocked.' : 'User blocked.');
  }

  async function handleStartupStatus(startupId: string, status: InvestmentOpportunity['status']) {
    const confirmed = await confirmAction(`Set this startup to ${status}?`);
    if (!confirmed) return;

    await runAdminAction(`startup-status:${startupId}:${status}`, async () => {
      await adminService.updateStartupStatus(startupId, status);
      setData((current) => (
        current
          ? {
            ...current,
            startupOpportunities: current.startupOpportunities.map((startup) => (
              startup.id === startupId ? { ...startup, status } : startup
            )),
          }
          : current
      ));
    }, `Startup status updated to ${status}.`);
  }

  async function handleDeleteStartup(startupId: string) {
    const confirmed = await confirmAction(
      'Delete this startup permanently?\n\nThis action cannot be undone.',
    );
    if (!confirmed) return;

    await runAdminAction(`delete-startup:${startupId}`, async () => {
      await adminService.deleteStartup(startupId);
      removeStartupFromData(startupId);
    }, 'Startup and all related records were deleted.');
  }

  async function handleSendAnnouncement() {
    if (!authUser || !announcementTitle.trim() || !announcementBody.trim()) {
      return;
    }

    await runAdminAction('announcement', async () => {
      await adminService.sendAnnouncement({
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
        target: 'everyone',
        createdBy: authUser.uid,
      });
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setAnnouncementNotice('Announcement delivered to all users. Offline users will see it the next time they open the app.');
    }, 'Announcement sent to all users.');
  }

  async function handleDeleteChatMessage(messageId: string) {
    const confirmed = await confirmAction('Delete this chat message permanently?');
    if (!confirmed) return;

    await runAdminAction(`delete-message:${messageId}`, async () => {
      await adminService.deleteMessage(messageId);
      setChatMessages((current) => current.filter((message) => message.id !== messageId));
    }, 'Chat message deleted.');
  }

  return (
    <Screen
      eyebrow="Admin"
      title="Ai PromptFund Admin Dashboard"
      subtitle="Private operations console for trusted administrators."
      leftAction={<ScreenHeaderBackButton />}
    >
      {toast ? (
        <Card style={toast.type === 'success' ? styles.successToast : styles.errorToast}>
          <Text style={toast.type === 'success' ? styles.successText : styles.errorText}>{toast.message}</Text>
        </Card>
      ) : null}
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
            {buildAdminPipelines(data, search, filter, usersById).map((item) => (
              <AdminStartupCard
                key={item.pipeline.id}
                item={item}
                usersById={usersById}
                workingKeys={workingKeys}
                onArchive={() => handleStartupStatus(item.pipeline.id, 'archived')}
                onFreeze={() => handleStartupStatus(item.pipeline.id, 'frozen')}
                onSuspend={() => handleStartupStatus(item.pipeline.id, 'suspended')}
                onRestore={() => handleStartupStatus(item.pipeline.id, 'active')}
                onOpenDiscussion={() => {
                  const roomId = getPipelineDiscussionRoomId(item.pipeline);
                  if (roomId) {
                    router.push(`/discussion-room/${roomId}`);
                  }
                }}
                onToggleBlockUser={handleToggleBlockUser}
                onDelete={() => handleDeleteStartup(item.pipeline.id)}
                onViewTimeline={() => router.push('/admin')}
              />
            ))}
          </AdminSection>

          <AdminInvestmentChats
            rooms={data.discussionRooms}
            messages={chatMessages}
            onDeleteMessage={handleDeleteChatMessage}
          />

          <AdminSection title="Reports">
            <Card>
              <Text style={styles.itemMeta}>Review per-message chat reports, approve, dismiss, suspend, or ban users.</Text>
              <PrimaryButton label="Open Chat Reports" onPress={() => router.push('/admin/reports')} />
            </Card>
            {data.reports.slice(0, 10).map((report) => (
              <Card key={report.id}>
                <Text style={styles.itemTitle}>{report.reason}</Text>
                <Text style={styles.itemMeta}>{report.reportedUid} · {report.status} · {safeDate(report.createdAt)}</Text>
                <Text style={styles.itemMeta}>{report.details}</Text>
                <PrimaryButton label="Review Report" variant="secondary" onPress={() => router.push(`/admin/report/${report.id}`)} />
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

          <AdminSection title="Support Tickets">
            {data.supportTickets.length === 0 ? (
              <Card>
                <Text style={styles.itemMeta}>No support tickets yet.</Text>
              </Card>
            ) : null}
            {sortSupportTickets(data.supportTickets).slice(0, 10).map((ticket) => (
              <Card key={ticket.id}>
                <Text style={styles.itemTitle}>Ticket #{ticket.ticketNumber}</Text>
                <Text style={styles.itemMeta}>{ticket.subject}</Text>
                <Text style={styles.itemMeta}>User: {ticket.userName} · {ticket.userEmail || ticket.userId}</Text>
                <Text style={styles.itemMeta}>Category: {ticket.category} · Status: {ticket.status} · Created: {supportDateTime(ticket.createdAt)}</Text>
                {ticket.unreadByAdmin ? <Text style={styles.unreadText}>Unread</Text> : null}
                <Text style={styles.itemMeta}>{ticket.message}</Text>
                <View style={ui.wrap}>
                  <PrimaryButton label="Manage Ticket" variant="secondary" onPress={() => router.push(`/admin/support-ticket/${ticket.id}`)} />
                  <PrimaryButton label="View User Profile" variant="secondary" onPress={() => router.push(`/admin/user/${ticket.userId}`)} />
                </View>
              </Card>
            ))}
          </AdminSection>

          <AdminSection title="Announcement Center">
            <Card>
              <Text style={styles.itemMeta}>Announcements are stored in Firestore and shown once per user. Offline users receive them automatically when they next open the app.</Text>
              <TextInput placeholder="Announcement title" placeholderTextColor={colors.subtle} value={announcementTitle} onChangeText={setAnnouncementTitle} style={styles.input} />
              <TextInput placeholder="Announcement body" placeholderTextColor={colors.subtle} value={announcementBody} onChangeText={setAnnouncementBody} multiline style={[styles.input, styles.textArea]} />
              <PrimaryButton label="Send Announcement To Everyone" onPress={handleSendAnnouncement} disabled={!announcementTitle.trim() || !announcementBody.trim()} />
              {announcementNotice ? <Text style={styles.successText}>{announcementNotice}</Text> : null}
            </Card>
          </AdminSection>

          <AdminSection title="Users">
            {data.users.slice(0, 8).map((user) => {
              const blocked = isUserBlocked(user);
              const blockKey = `block:${user.id}`;
              const suspendKey = `suspend:${user.id}`;
              return (
                <Card key={user.id}>
                  <Text style={styles.itemTitle}>{user.displayName ?? user.name}</Text>
                  <Text style={styles.itemMeta}>{user.username ?? user.handle} · {user.status ?? 'active'} · {getRoleBadgeLabel(user.role)}</Text>
                  <View style={ui.wrap}>
                    <PrimaryButton label="View User Profile" variant="secondary" onPress={() => router.push(`/admin/user/${user.id}`)} />
                    <PrimaryButton
                      label={workingKeys.has(suspendKey) ? 'Working...' : 'Suspend User'}
                      variant="secondary"
                      disabled={workingKeys.has(suspendKey)}
                      onPress={() => handleSuspendUser(user.id)}
                    />
                    <PrimaryButton
                      label={workingKeys.has(blockKey) ? 'Working...' : blocked ? 'Unblock User' : 'Block User'}
                      variant="secondary"
                      disabled={workingKeys.has(blockKey)}
                      onPress={() => handleToggleBlockUser(user.id)}
                    />
                  </View>
                </Card>
              );
            })}
          </AdminSection>
        </>
      ) : null}
    </Screen>
  );
}

function timestampMillis(value: unknown) {
  if (typeof value === 'object' && value && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
}

function supportDateTime(value: unknown) {
  if (typeof value === 'object' && value && 'toDate' in value) {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format((value as { toDate: () => Date }).toDate());
  }

  return 'Just now';
}

function sortSupportTickets(tickets: SupportTicket[]) {
  return [...tickets].sort((left, right) => timestampMillis(right.createdAt) - timestampMillis(left.createdAt));
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

function buildAdminPipelines(
  data: AdminData,
  search: string,
  filter: AdminFilter,
  usersById: Record<string, User>,
) {
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
      founderUser: pipeline.opportunity?.founderId ? usersById[pipeline.opportunity.founderId] : undefined,
      investorUser: pipeline.room?.investorId ? usersById[pipeline.room.investorId] : undefined,
      isBlocked: Boolean(
        (pipeline.opportunity?.founderId && isUserBlocked(usersById[pipeline.opportunity.founderId]))
        || (pipeline.room?.investorId && isUserBlocked(usersById[pipeline.room.investorId])),
      ),
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
  usersById,
  workingKeys,
  onArchive,
  onFreeze,
  onSuspend,
  onRestore,
  onOpenDiscussion,
  onToggleBlockUser,
  onDelete,
  onViewTimeline,
}: {
  item: ReturnType<typeof buildAdminPipelines>[number];
  usersById: Record<string, User>;
  workingKeys: Set<string>;
  onArchive: () => void;
  onFreeze: () => void;
  onSuspend: () => void;
  onRestore: () => void;
  onOpenDiscussion: () => void;
  onToggleBlockUser: (userId: string) => void;
  onDelete: () => void;
  onViewTimeline: () => void;
}) {
  const pipeline = item.pipeline;
  const startup = pipeline.opportunity;
  const founder = startup?.founderName ?? pipeline.agreement?.founderName ?? 'Founder';
  const investor = pipeline.room?.investorName ?? pipeline.agreement?.investorName ?? 'Angel Investor';
  const founderId = startup?.founderId ?? pipeline.agreement?.founderId;
  const investorId = pipeline.room?.investorId ?? pipeline.agreement?.investorId;
  const founderBlocked = founderId ? isUserBlocked(usersById[founderId]) : false;
  const investorBlocked = investorId ? isUserBlocked(usersById[investorId]) : false;
  const deleteKey = `delete-startup:${pipeline.id}`;
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
        <PrimaryButton label="Open Deal Room" variant="secondary" onPress={onOpenDiscussion} />
        <PrimaryButton label="Archive Startup" variant="secondary" onPress={onArchive} />
        <PrimaryButton label="Freeze Startup" variant="secondary" onPress={onFreeze} />
        <PrimaryButton label="Suspend Startup" variant="secondary" onPress={onSuspend} />
        <PrimaryButton label="Restore Startup" variant="secondary" onPress={onRestore} />
        {founderId ? (
          <PrimaryButton
            label={workingKeys.has(`block:${founderId}`) ? 'Working...' : founderBlocked ? 'Unblock Founder' : 'Block Founder'}
            variant="secondary"
            disabled={workingKeys.has(`block:${founderId}`)}
            onPress={() => onToggleBlockUser(founderId)}
          />
        ) : null}
        {investorId ? (
          <PrimaryButton
            label={workingKeys.has(`block:${investorId}`) ? 'Working...' : investorBlocked ? 'Unblock Investor' : 'Block Investor'}
            variant="secondary"
            disabled={workingKeys.has(`block:${investorId}`)}
            onPress={() => onToggleBlockUser(investorId)}
          />
        ) : null}
        <PrimaryButton
          label={workingKeys.has(deleteKey) ? 'Deleting...' : 'Delete Startup'}
          variant="secondary"
          disabled={workingKeys.has(deleteKey)}
          onPress={onDelete}
        />
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
  successText: {
    color: colors.success,
    lineHeight: 22,
  },
  successToast: {
    borderColor: 'rgba(46, 125, 50, 0.45)',
  },
  errorToast: {
    borderColor: 'rgba(177, 18, 38, 0.45)',
  },
  unreadText: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: radii.pill,
    backgroundColor: colors.pokerRed,
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
});
