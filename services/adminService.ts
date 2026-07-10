import { doc, writeBatch } from 'firebase/firestore';

import { firestoreAdapter, firestoreCollections, getPromptFundFirestore, type FirestoreCollectionName } from '@/firebase/firestore';
import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';
import { notificationService } from '@/services/notificationService';
import { supportService } from '@/services/supportService';
import type { AgreementRoom } from '@/types/Agreement';
import type { Match } from '@/types/FundingRequest';
import type { ActivityTimelineEvent, AdminAnnouncement, ModerationFlag, SupportTicket, SupportTicketStatus, User, UserReport, UserStatus } from '@/types/User';
import type { DiscussionMessage, DiscussionRoom, InvestmentAgreement, InvestmentOpportunity, StartupInterest, V5Investment } from '@/types/InvestmentFlow';
import type { Project } from '@/types/Project';

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

export function isAdminEmail(email: string | null | undefined) {
  return email?.toLowerCase() === adminEmail;
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
    return userService.updateUser(userId, { status });
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
    return firestoreAdapter.update<InvestmentOpportunity>('startupOpportunities', startupId, { status });
  },

  async deleteStartup(startupId: string) {
    const [interests, matches] = await Promise.all([
      firestoreAdapter.queryByField<StartupInterest>('interests', 'startupOpportunityId', startupId),
      firestoreAdapter.queryByField<Match>('matches', 'startupId', startupId),
    ]);

    const batch = writeBatch(getPromptFundFirestore());
    interests.forEach((interest) => {
      batch.delete(doc(getPromptFundFirestore(), firestoreCollections.interests, interest.id));
    });
    matches.forEach((match) => {
      batch.delete(doc(getPromptFundFirestore(), firestoreCollections.matches, match.id));
    });
    batch.delete(doc(getPromptFundFirestore(), firestoreCollections.startupOpportunities, startupId));
    await batch.commit();

    await this.recordTimeline({
      startupId,
      actorId: 'admin',
      eventType: 'admin_action',
      label: 'Admin deleted startup',
    });
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
    return firestoreAdapter.deleteById('discussionRooms', roomId);
  },

  async deleteMessage(messageId: string) {
    return firestoreAdapter.deleteById('discussionMessages', messageId);
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
    const announcement = await firestoreAdapter.create<Omit<AdminAnnouncement, 'id'>>('adminAnnouncements', {
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

  async recordTimeline(input: Omit<ActivityTimelineEvent, 'id' | 'createdAt'>) {
    return firestoreAdapter.create<Omit<ActivityTimelineEvent, 'id'>>('activityTimeline', {
      ...input,
      createdAt: new Date().toISOString(),
    });
  },

  async getUserReport(reportId: string) {
    return firestoreAdapter.getById<UserReport>('userReports', reportId);
  },

  async dismissReport(reportId: string, reviewedBy: string) {
    return firestoreAdapter.update<UserReport>('userReports', reportId, {
      status: 'dismissed',
      resolvedAt: new Date().toISOString(),
      reviewedBy,
    });
  },

  async resolveReport(reportId: string, reviewedBy: string): Promise<UserReport | null> {
    return firestoreAdapter.update<UserReport>('userReports', reportId, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      reviewedBy,
    });
  },

  async deleteReport(reportId: string) {
    return firestoreAdapter.deleteById('userReports', reportId);
  },
};
