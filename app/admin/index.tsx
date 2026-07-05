import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminInvestmentChats } from '@/components/admin/AdminInvestmentChats';
import { Card, LoadingState, PrimaryButton, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { adminService } from '@/services/adminService';
import type { AgreementRoom } from '@/types/Agreement';
import type { InvestmentInterest, Match } from '@/types/FundingRequest';
import type { Project } from '@/types/Project';
import type { LegalDocumentVersions, ModerationFlag, SupportTicket, SupportTicketStatus, User, UserReport, ActivityTimelineEvent } from '@/types/User';
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
  legalVersions: LegalDocumentVersions;
  supportTickets: SupportTicket[];
  revenue: number;
  portfolioVolume: number;
};

type AdminFilter = 'all' | 'active' | 'completed' | 'reported' | 'blocked' | 'archived';
const supportStatuses: SupportTicketStatus[] = ['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed'];

export default function AdminDashboardScreen() {
  const { authUser, initializing, profile } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AdminFilter>('active');
  const [search, setSearch] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [legalVersionDraft, setLegalVersionDraft] = useState<LegalDocumentVersions | null>(null);
  const [supportReplyDrafts, setSupportReplyDrafts] = useState<Record<string, string>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

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
        setLegalVersionDraft(nextData.legalVersions);
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

  async function handleUpdateLegalVersions() {
    if (!legalVersionDraft) return;

    try {
      setError(null);
      await adminService.updateLegalVersions(legalVersionDraft);
      const nextData = await adminService.getDashboardData();
      setData(nextData);
      setLegalVersionDraft(nextData.legalVersions);
    } catch (versionError) {
      setError(getFriendlyErrorMessage(versionError));
    }
  }

  async function handleSupportReply(ticketId: string) {
    const body = supportReplyDrafts[ticketId]?.trim();
    if (!authUser?.uid || !body) return;

    try {
      setError(null);
      await adminService.replyToSupportTicket(ticketId, authUser.uid, body);
      setSupportReplyDrafts((current) => ({ ...current, [ticketId]: '' }));
      setData(await adminService.getDashboardData());
    } catch (replyError) {
      setError(getSupportErrorMessage(replyError));
    }
  }

  async function handleSupportStatus(ticketId: string, status: SupportTicketStatus) {
    try {
      setError(null);
      await adminService.updateSupportTicketStatus(ticketId, status);
      setData(await adminService.getDashboardData());
    } catch (statusError) {
      setError(getSupportErrorMessage(statusError));
    }
  }

  async function handleDeleteChatMessage(messageId: string) {
    try {
      await adminService.deleteMessage(messageId);
      setChatMessages((current) => current.filter((message) => message.id !== messageId));
    } catch (deleteError) {
      setError(getFriendlyErrorMessage(deleteError));
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
                onOpenDiscussion={() => {
                  const roomId = getPipelineDiscussionRoomId(item.pipeline);
                  if (roomId) {
                    router.push(`/discussion-room/${roomId}`);
                  }
                }}
                onBlockFounder={() => item.pipeline.opportunity?.founderId ? handleUserStatus(item.pipeline.opportunity.founderId, 'banned') : undefined}
                onBlockInvestor={() => item.pipeline.room?.investorId ? handleUserStatus(item.pipeline.room.investorId, 'banned') : undefined}
                onDelete={() => handleDeleteStartup(item.pipeline.id)}
                onViewTimeline={() => router.push(`/admin`)}
              />
            ))}
          </AdminSection>

          <AdminInvestmentChats
            rooms={data.discussionRooms}
            messages={chatMessages}
            onDeleteMessage={handleDeleteChatMessage}
          />

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
                  {supportStatuses.map((status) => (
                    <Pressable
                      key={status}
                      onPress={() => handleSupportStatus(ticket.id, status)}
                      style={[styles.filterChip, ticket.status === status ? styles.filterChipActive : null]}
                    >
                      <Text style={styles.filterText}>{status}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  placeholder="Reply to this ticket"
                  placeholderTextColor={colors.subtle}
                  value={supportReplyDrafts[ticket.id] ?? ''}
                  onChangeText={(value) => setSupportReplyDrafts((current) => ({ ...current, [ticket.id]: value }))}
                  multiline
                  style={[styles.input, styles.textArea]}
                />
                <View style={ui.wrap}>
                  <PrimaryButton label="Open Conversation" variant="secondary" onPress={() => router.push(`/profile/support-ticket/${ticket.id}`)} />
                  <PrimaryButton label="Send Reply" onPress={() => handleSupportReply(ticket.id)} disabled={!supportReplyDrafts[ticket.id]?.trim()} />
                </View>
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

          <AdminSection title="Legal Versions">
            <Card>
              {legalVersionDraft ? (
                <>
                  <TextInput
                    placeholder="App version"
                    placeholderTextColor={colors.subtle}
                    value={legalVersionDraft.appVersion}
                    onChangeText={(appVersion) => setLegalVersionDraft({ ...legalVersionDraft, appVersion })}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="Terms version"
                    placeholderTextColor={colors.subtle}
                    value={legalVersionDraft.termsVersion}
                    onChangeText={(termsVersion) => setLegalVersionDraft({ ...legalVersionDraft, termsVersion })}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="Privacy version"
                    placeholderTextColor={colors.subtle}
                    value={legalVersionDraft.privacyVersion}
                    onChangeText={(privacyVersion) => setLegalVersionDraft({ ...legalVersionDraft, privacyVersion })}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="Community version"
                    placeholderTextColor={colors.subtle}
                    value={legalVersionDraft.communityVersion}
                    onChangeText={(communityVersion) => setLegalVersionDraft({ ...legalVersionDraft, communityVersion })}
                    style={styles.input}
                  />
                  <PrimaryButton label="Update Legal Versions" onPress={handleUpdateLegalVersions} />
                </>
              ) : (
                <Text style={styles.itemMeta}>Loading legal versions...</Text>
              )}
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

function getSupportErrorMessage(error: unknown) {
  console.error('[PromptFund Admin Support] Firebase support error', error);
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : null;
  const message = error instanceof Error ? error.message : String(error);

  if (code === 'permission-denied') {
    return `Firestore permission denied for admin support action. Check supportTickets status/message rules for admin role. Firebase: ${message}`;
  }

  return code ? `${code}: ${message}` : message;
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
      isBlocked: false,
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
        <PrimaryButton label="Open Deal Room" variant="secondary" onPress={onOpenDiscussion} />
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
