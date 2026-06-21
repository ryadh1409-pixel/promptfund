import { firestoreAdapter, firestoreCollections, type FirestoreCollectionName } from '@/firebase/firestore';
import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';
import type { AgreementRoom } from '@/types/Agreement';
import type { Investment, Match } from '@/types/FundingRequest';
import type { Project } from '@/types/Project';
import type { BlockedUser, User, UserReport, UserStatus } from '@/types/User';

export const adminEmail = 'ryadh1409@gmail.com';

export function isAdminEmail(email: string | null | undefined) {
  return email?.toLowerCase() === adminEmail;
}

async function adminList<T>(collectionName: FirestoreCollectionName) {
  console.log('Admin query:', collectionName);

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
    const investments = await adminList<Investment>('investments');
    const matches = await adminList<Match>('matches');
    const agreements = await adminList<AgreementRoom>('agreementRooms');
    const reports = await adminList<UserReport>('userReports');
    const blockedUsers = await adminList<BlockedUser>('blockedUsers');

    return {
      users,
      projects,
      investments,
      matches,
      agreements,
      reports,
      blockedUsers,
      revenue: investments.reduce((sum: number, investment: Investment) => sum + investment.amount * 0.025, 0),
      portfolioVolume: investments.reduce((sum: number, investment: Investment) => sum + investment.amount, 0),
    };
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<User | null> {
    return userService.updateUser(userId, { status });
  },

  async deleteUserProfile(userId: string): Promise<void> {
    await userService.deleteProfile(userId);
  },

  async updateProjectStatus(projectId: string, status: Project['status']): Promise<Project | null> {
    return projectService.updateProject(projectId, { status });
  },

  async resolveReport(reportId: string): Promise<UserReport | null> {
    return firestoreAdapter.update<UserReport>('userReports', reportId, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
  },
};
