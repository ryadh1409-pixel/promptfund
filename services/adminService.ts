import { collection, doc, getDocs } from 'firebase/firestore';

import { chatSafetyCollections } from '@/firebase/chatSafety';
import { firestoreAdapter, firestoreCollections, getPromptFundFirestore, type FirestoreCollectionName } from '@/firebase/firestore';
import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';
import { notificationService } from '@/services/notificationService';
import { supportService } from '@/services/supportService';
import { adminFirestore } from '@/utils/adminFirestoreAudit';
import type { AgreementRoom } from '@/types/Agreement';
import type { Match } from '@/types/FundingRequest';
import type { ActivityTimelineEvent, AdminAnnouncement, AppNotification, DiscussionReport, ModerationFlag, SupportTicket, SupportTicketStatus, User, UserReport, UserStatus } from '@/types/User';
import type { DiscussionMessage, DiscussionRoom, InvestmentAgreement, InvestmentOpportunity, StartupInterest, V5Investment } from '@/types/InvestmentFlow';
import type { Project } from '@/types/Project';
import type { FounderUpdate } from '@/types/Traction';

export const adminEmail = 'ryadh1409@gmail.com';

export type AdminUserProfileDetail = {
  user: User;
  investments: V5Investment[];
  portfolioCompanies: V5Investment[];
  reportsSubmitted: UserReport[];
  reportsReceived: UserReport[];
  activity: ActivityTimelineEvent[];
};

async function adminList<T>(collectionName: FirestoreCollectionName) {
  try {
    return await firestoreAdapter.list<T>(collectionName);
  } catch (error) {
    console.error('Admin query failed:', {
      collectionName,
      path: `${firestoreCollections[collectionName]}/*`,
      error,
    });
    throw error;
  }
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return items.filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index);
}

export function isAdminEmail(email: string | null | undefined) {
  return email?.toLowerCase() === adminEmail;
}

export function isUserBlocked(user?: Pick<User, 'status'> | null) {
  return user?.status === 'banned';
}

export const adminService = {
  async getDashboardData() {
    const users = await adminList<User>('users');
    const projects = await adminList<Project>('projects');
    const investments = await adminList<V5Investment>('investments');
    const matches = await adminList<Match>('matches');
    const agreements = await adminList<AgreementRoom>('agreementRooms');
    const investmentAgreements = await adminList<InvestmentAgreement>('agreements');
    const startupOpportunities = await adminList<InvestmentOpportunity>('startupOpportunities');
    const interests = await adminList<StartupInterest>('interests');
    const discussionRooms = await adminList<DiscussionRoom>('discussionRooms');
    const reports = await adminList<UserReport>('userReports');
    const moderationFlags = await adminList<ModerationFlag>('moderationFlags');
    const activityTimeline = await adminList<ActivityTimelineEvent>('activityTimeline');
    const supportTickets = await adminList<SupportTicket>('supportTickets');

    return {
      users,
      projects,
      investments,
      matches,
      agreements,
      investmentAgreements,
      startupOpportunities,
      interests,
      discussionRooms,
      reports,
      moderationFlags,
      activityTimeline,
      supportTickets,
      revenue: investments.reduce((sum: number, investment: V5Investment) => sum + (investment.amount ?? 0) * 0.025, 0),
      portfolioVolume: investments.reduce((sum: number, investment: V5Investment) => sum + (investment.amount ?? 0), 0),
    };
  },

  async getUserProfileDetail(userId: string): Promise<AdminUserProfileDetail | null> {
    const user = await userService.getUserById(userId);
    if (!user) {
      return null;
    }

    const [
      founderInvestments,
      investorInvestments,
      reportsSubmitted,
      reportsReceived,
      activity,
    ] = await Promise.all([
      firestoreAdapter.queryByField<V5Investment>('investments', 'founderId', userId),
      firestoreAdapter.queryByField<V5Investment>('investments', 'investorId', userId),
      firestoreAdapter.queryByField<UserReport>('userReports', 'reporterUid', userId),
      firestoreAdapter.queryByField<UserReport>('userReports', 'reportedUid', userId),
      firestoreAdapter.list<ActivityTimelineEvent>('activityTimeline'),
    ]);

    const investments = [...founderInvestments, ...investorInvestments]
      .filter((investment, index, list) => list.findIndex((item) => item.id === investment.id) === index);
    const portfolioCompanies = investments.filter((investment) => investment.status === 'completed' || investment.status === 'funding_confirmed');

    return {
      user,
      investments,
      portfolioCompanies,
      reportsSubmitted,
      reportsReceived,
      activity: activity
        .filter((event) => event.actorId === userId)
        .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))),
    };
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<User | null> {
    const updated = await adminFirestore.update<User>('users', userId, { status });
    return updated;
  },

  async blockUserAccount(userId: string) {
    return this.updateUserStatus(userId, 'banned');
  },

  async unblockUserAccount(userId: string) {
    return this.updateUserStatus(userId, 'active');
  },

  async replyToSupportTicket(ticketId: string, adminId: string, body: string) {
    return supportService.addMessage({
      ticketId,
      senderId: adminId,
      senderRole: 'admin',
      body,
    });
  },

  async updateSupportTicketStatus(ticketId: string, status: SupportTicketStatus) {
    return supportService.updateTicketStatus(ticketId, status);
  },

  async deleteSupportTicket(ticketId: string) {
    return supportService.deleteTicket(ticketId);
  },

  async deleteUserProfile(userId: string): Promise<void> {
    await userService.deleteProfile(userId);
  },

  async updateProjectStatus(projectId: string, status: Project['status']): Promise<Project | null> {
    return projectService.updateProject(projectId, { status });
  },

  async updateStartupStatus(startupId: string, status: InvestmentOpportunity['status']) {
    await this.recordTimeline({
      startupId,
      actorId: 'admin',
      eventType: 'admin_action',
      label: `Admin set startup status to ${status}`,
      metadata: { status },
    });
    return adminFirestore.update<InvestmentOpportunity>('startupOpportunities', startupId, { status });
  },

  async deleteStartup(startupId: string) {
    const [
      interests,
      matches,
      roomsByOpportunity,
      roomsByStartupOpportunityId,
      agreements,
      allInvestments,
      userReports,
      allTimeline,
      allMessages,
      allNotifications,
      project,
      fundingRequests,
      allModerationFlags,
      allAgreementRooms,
      allDiscussionReports,
      allFounderUpdates,
      messageReportsSnapshot,
    ] = await Promise.all([
      firestoreAdapter.queryByField<StartupInterest>('interests', 'startupOpportunityId', startupId),
      firestoreAdapter.queryByField<Match>('matches', 'startupId', startupId),
      firestoreAdapter.queryByField<DiscussionRoom>('discussionRooms', 'opportunityId', startupId),
      firestoreAdapter.queryByField<DiscussionRoom>('discussionRooms', 'startupOpportunityId', startupId),
      firestoreAdapter.queryByField<InvestmentAgreement>('agreements', 'opportunityId', startupId),
      adminList<V5Investment>('investments'),
      firestoreAdapter.queryByField<UserReport>('userReports', 'startupId', startupId),
      adminList<ActivityTimelineEvent>('activityTimeline'),
      adminList<DiscussionMessage>('discussionMessages'),
      adminList<AppNotification>('notifications'),
      firestoreAdapter.getById<Project>('projects', startupId),
      firestoreAdapter.queryByField('fundingRequests', 'projectId', startupId),
      adminList<ModerationFlag>('moderationFlags'),
      adminList<AgreementRoom>('agreementRooms'),
      adminList<DiscussionReport>('reports'),
      adminList<FounderUpdate>('founderUpdates'),
      getDocs(collection(getPromptFundFirestore(), chatSafetyCollections.messageReports)),
    ]);

    const discussionRooms = uniqueById([...roomsByOpportunity, ...roomsByStartupOpportunityId]);
    const roomIds = new Set(discussionRooms.map((room) => room.id));
    const agreementIds = new Set(agreements.map((agreement) => agreement.id));
    const investmentIds = new Set(
      allInvestments
        .filter((investment) => (
          investment.opportunityId === startupId
          || investment.startupId === startupId
          || investment.projectId === startupId
        ))
        .map((investment) => investment.id),
    );

    const investments = allInvestments.filter((investment) => investmentIds.has(investment.id));
    const messages = allMessages.filter((message) => roomIds.has(message.discussionRoomId));
    const timeline = allTimeline.filter((event) => (
      event.startupId === startupId
      || (event.discussionRoomId ? roomIds.has(event.discussionRoomId) : false)
      || (event.agreementId ? agreementIds.has(event.agreementId) : false)
    ));
    const moderationFlags = allModerationFlags.filter((flag) => (
      flag.discussionRoomId ? roomIds.has(flag.discussionRoomId) : false
    ));
    const agreementRooms = allAgreementRooms.filter((room) => room.projectId === startupId);
    const discussionReports = allDiscussionReports.filter((report) => (
      report.discussionRoomId ? roomIds.has(report.discussionRoomId) : false
    ));
    const founderUpdates = allFounderUpdates.filter((update) => (
      update.investmentId ? investmentIds.has(update.investmentId) : false
    ));
    const messageReports = messageReportsSnapshot.docs
      .map((item) => ({ id: item.id, ...(item.data() as { roomId?: string }) }))
      .filter((report) => report.roomId && roomIds.has(report.roomId));
    const notifications = allNotifications.filter((notification) => notification.data?.startupId === startupId);

    const deletes: Array<{ collection: FirestoreCollectionName | string; id: string }> = [
      ...interests.map((item) => ({ collection: 'interests' as const, id: item.id })),
      ...matches.map((item) => ({ collection: 'matches' as const, id: item.id })),
      ...discussionRooms.map((item) => ({ collection: 'discussionRooms' as const, id: item.id })),
      ...agreements.map((item) => ({ collection: 'agreements' as const, id: item.id })),
      ...investments.map((item) => ({ collection: 'investments' as const, id: item.id })),
      ...userReports.map((item) => ({ collection: 'userReports' as const, id: item.id })),
      ...timeline.map((item) => ({ collection: 'activityTimeline' as const, id: item.id })),
      ...messages.map((item) => ({ collection: 'discussionMessages' as const, id: item.id })),
      ...notifications.map((item) => ({ collection: 'notifications' as const, id: item.id })),
      ...fundingRequests.map((item) => ({ collection: 'fundingRequests' as const, id: item.id })),
      ...moderationFlags.map((item) => ({ collection: 'moderationFlags' as const, id: item.id })),
      ...agreementRooms.map((item) => ({ collection: 'agreementRooms' as const, id: item.id })),
      ...discussionReports.map((item) => ({ collection: 'reports' as const, id: item.id })),
      ...founderUpdates.map((item) => ({ collection: 'founderUpdates' as const, id: item.id })),
      ...messageReports.map((item) => ({ collection: chatSafetyCollections.messageReports, id: item.id })),
      { collection: 'startupOpportunities', id: startupId },
    ];

    if (project) {
      deletes.push({ collection: 'projects', id: project.id });
    }

    await adminFirestore.deleteMany(deletes);
  },

  async blockUser(blockerUid: string, blockedUid: string) {
    const [blocker, blocked] = await Promise.all([
      userService.getUserById(blockerUid),
      userService.getUserById(blockedUid),
    ]);
    if (!blocker || !blocked) {
      throw new Error('Unable to load users for block action.');
    }
    return userService.blockUser({ blocker, blocked });
  },

  async deleteDiscussionRoom(roomId: string) {
    return adminFirestore.delete('discussionRooms', roomId);
  },

  async deleteMessage(messageId: string) {
    return adminFirestore.delete('discussionMessages', messageId);
  },

  async listDiscussionMessages(): Promise<DiscussionMessage[]> {
    return adminList<DiscussionMessage>('discussionMessages');
  },

  async sendAnnouncement(input: {
    title: string;
    body: string;
    target?: AdminAnnouncement['target'];
    createdBy: string;
  }) {
    const announcement = await adminFirestore.create<Omit<AdminAnnouncement, 'id'>>('adminAnnouncements', {
      title: input.title,
      body: input.body,
      target: input.target ?? 'everyone',
      createdBy: input.createdBy,
      sentBy: input.createdBy,
      readBy: [],
      createdAt: new Date().toISOString(),
    });
    const users = await adminList<User>('users');
    const targets = users.filter((user) => {
      if (input.target === 'founders') {
        return user.activeRole === 'founder' || user.role === 'founder' || user.role === 'entrepreneur';
      }
      if (input.target === 'investors') {
        return user.activeRole === 'investor' || user.role === 'investor' || user.role === 'angel_investor';
      }
      if (input.target === 'single_user') {
        return false;
      }
      return true;
    });

    await Promise.all(targets.map((user) => notificationService.createNotification({
      userId: user.id,
      title: input.title,
      body: input.body,
      type: 'admin_announcement',
      data: { announcementId: announcement.id },
    })));

    return announcement;
  },

  async deleteAnnouncement(announcementId: string) {
    return adminFirestore.delete('adminAnnouncements', announcementId);
  },

  async recordTimeline(input: Omit<ActivityTimelineEvent, 'id' | 'createdAt'>) {
    return adminFirestore.create<Omit<ActivityTimelineEvent, 'id'>>('activityTimeline', {
      ...input,
      createdAt: new Date().toISOString(),
    });
  },

  async getUserReport(reportId: string) {
    return firestoreAdapter.getById<UserReport>('userReports', reportId);
  },

  async dismissReport(reportId: string, reviewedBy: string) {
    return adminFirestore.update<UserReport>('userReports', reportId, {
      status: 'dismissed',
      resolvedAt: new Date().toISOString(),
      reviewedBy,
    });
  },

  async resolveReport(reportId: string, reviewedBy: string): Promise<UserReport | null> {
    return adminFirestore.update<UserReport>('userReports', reportId, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      reviewedBy,
    });
  },

  async deleteReport(reportId: string) {
    return adminFirestore.delete('userReports', reportId);
  },
};
