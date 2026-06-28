import { firestoreAdapter, firestoreCollections, type FirestoreCollectionName } from '@/firebase/firestore';
import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';
import { notificationService } from '@/services/notificationService';
import { legalService } from '@/services/legalService';
import type { AgreementRoom } from '@/types/Agreement';
import type { Investment, Match } from '@/types/FundingRequest';
import type { ActivityTimelineEvent, AdminAnnouncement, LegalDocumentVersions, ModerationFlag, User, UserReport, UserStatus } from '@/types/User';
import type { DiscussionMessage, DiscussionRoom, InvestmentAgreement, InvestmentOpportunity, StartupInterest, V5Investment } from '@/types/InvestmentFlow';
import type { Project } from '@/types/Project';

export const adminEmail = 'ryadh1409@gmail.com';

export function isAdminEmail(email: string | null | undefined) {
  return email?.toLowerCase() === adminEmail;
}

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
    const legalVersions = await legalService.getCurrentVersions();

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
      legalVersions,
      revenue: investments.reduce((sum: number, investment: V5Investment) => sum + (investment.amount ?? 0) * 0.025, 0),
      portfolioVolume: investments.reduce((sum: number, investment: V5Investment) => sum + (investment.amount ?? 0), 0),
    };
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<User | null> {
    return userService.updateUser(userId, { status });
  },

  async updateLegalVersions(versions: LegalDocumentVersions) {
    return legalService.updateVersions(versions);
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
    await this.recordTimeline({
      startupId,
      actorId: 'admin',
      eventType: 'admin_action',
      label: 'Admin deleted startup',
    });
    return firestoreAdapter.deleteById('startupOpportunities', startupId);
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

  async sendAnnouncement(input: Omit<AdminAnnouncement, 'id' | 'createdAt'>) {
    const announcement = await firestoreAdapter.create<Omit<AdminAnnouncement, 'id'>>('adminAnnouncements', {
      ...input,
      createdAt: new Date().toISOString(),
    });
    const users = await adminList<User>('users');
    const targets = users.filter((user) => {
      if (input.target === 'everyone') return true;
      if (input.target === 'founders') return user.activeRole === 'founder' || user.role === 'founder' || user.role === 'entrepreneur';
      if (input.target === 'investors') return user.activeRole === 'investor' || user.role === 'investor' || user.role === 'angel_investor';
      return user.id === input.targetUserId;
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

  async resolveReport(reportId: string): Promise<UserReport | null> {
    return firestoreAdapter.update<UserReport>('userReports', reportId, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
  },
};
