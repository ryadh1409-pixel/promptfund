import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import {
  CHAT_SAFETY_THRESHOLDS,
  chatSafetyCollections,
  messageReportDocumentId,
} from '@/firebase/chatSafety';
import { firestoreAdapter, firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { AppError } from '@/services/errorHandler';
import { userService } from '@/services/userService';
import type { MessageReport, MessageReportReason, MessageReportStatus } from '@/types/ChatSafety';
import type { User } from '@/types/User';
import { shouldRenderMessage } from '@/utils/chatMessageVisibility';

export { shouldRenderMessage };

function nowIso() {
  return new Date().toISOString();
}

function mapReport(id: string, data: Record<string, unknown>): MessageReport {
  return {
    id,
    reporterId: String(data.reporterId ?? ''),
    reportedUserId: String(data.reportedUserId ?? ''),
    roomId: String(data.roomId ?? ''),
    messageId: String(data.messageId ?? ''),
    reason: data.reason as MessageReportReason,
    details: typeof data.details === 'string' ? data.details : undefined,
    createdAt: String(data.createdAt ?? nowIso()),
    status: (data.status as MessageReportStatus) ?? 'pending',
    reviewedAt: typeof data.reviewedAt === 'string' ? data.reviewedAt : undefined,
    reviewedBy: typeof data.reviewedBy === 'string' ? data.reviewedBy : undefined,
  };
}

export type SubmitMessageReportInput = {
  reporterId: string;
  reportedUserId: string;
  roomId: string;
  messageId: string;
  reason: MessageReportReason;
  details?: string;
};

export type SubmitMessageReportResult = {
  report: MessageReport;
  alreadyExists: boolean;
};

async function incrementUserReportCount(reportedUserId: string) {
  const userRef = doc(getPromptFundFirestore(), firestoreCollections.users, reportedUserId);
  await runTransaction(getPromptFundFirestore(), async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) return;

    const current = typeof snapshot.data().reportedCount === 'number' ? snapshot.data().reportedCount : 0;
    const nextCount = current + 1;
    const updates: Record<string, unknown> = {
      reportedCount: nextCount,
      updatedAt: serverTimestamp(),
    };

    if (nextCount >= CHAT_SAFETY_THRESHOLDS.TEMP_SUSPEND_REPORT_COUNT && snapshot.data().status !== 'banned') {
      updates.status = 'suspended';
      updates.suspendedAt = nowIso();
    }

    transaction.update(userRef, updates);
  });
}

async function applyAutomaticMessageModeration(messageId: string) {
  const messageRef = doc(getPromptFundFirestore(), firestoreCollections.discussionMessages, messageId);
  await runTransaction(getPromptFundFirestore(), async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    if (!snapshot.exists()) return;

    const currentCount = typeof snapshot.data().reportedCount === 'number' ? snapshot.data().reportedCount : 0;
    const nextCount = currentCount + 1;
    const updates: Record<string, unknown> = {
      reportedCount: nextCount,
      updatedAt: serverTimestamp(),
    };

    if (nextCount >= CHAT_SAFETY_THRESHOLDS.HIDE_MESSAGE_REPORT_COUNT) {
      updates.hiddenByModeration = true;
      updates.text = '';
      updates.body = '';
    }

    transaction.update(messageRef, updates);
  });
}

export const chatReportService = {
  async getReportById(reportId: string): Promise<MessageReport | null> {
    const snapshot = await getDoc(doc(getPromptFundFirestore(), chatSafetyCollections.messageReports, reportId));
    if (!snapshot.exists()) return null;
    return mapReport(snapshot.id, snapshot.data() as Record<string, unknown>);
  },

  async listReports(status?: MessageReportStatus): Promise<MessageReport[]> {
    const reportsRef = collection(getPromptFundFirestore(), chatSafetyCollections.messageReports);
    const snapshot = await getDocs(reportsRef);
    const reports = snapshot.docs.map((item) => mapReport(item.id, item.data() as Record<string, unknown>));
    if (!status) {
      return reports.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    }
    return reports
      .filter((report) => report.status === status)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  },

  async listPendingReports(): Promise<MessageReport[]> {
    return this.listReports('pending');
  },

  async listReviewedReports(): Promise<MessageReport[]> {
    const [reviewed, dismissed, approved] = await Promise.all([
      this.listReports('reviewed'),
      this.listReports('dismissed'),
      this.listReports('approved'),
    ]);
    return [...reviewed, ...dismissed, ...approved].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  },

  async submitMessageReport(input: SubmitMessageReportInput): Promise<SubmitMessageReportResult> {
    const reportId = messageReportDocumentId(input.messageId, input.reporterId);
    const reportRef = doc(getPromptFundFirestore(), chatSafetyCollections.messageReports, reportId);
    const existingSnapshot = await getDoc(reportRef);

    if (existingSnapshot.exists()) {
      return {
        report: mapReport(existingSnapshot.id, existingSnapshot.data() as Record<string, unknown>),
        alreadyExists: true,
      };
    }

    const payload = {
      reporterId: input.reporterId,
      reportedUserId: input.reportedUserId,
      roomId: input.roomId,
      messageId: input.messageId,
      reason: input.reason,
      details: input.details?.trim() ?? '',
      createdAt: nowIso(),
      status: 'pending' as MessageReportStatus,
    };

    await setDoc(reportRef, payload);
    await applyAutomaticMessageModeration(input.messageId);
    await incrementUserReportCount(input.reportedUserId);

    return {
      report: { ...payload, id: reportId },
      alreadyExists: false,
    };
  },

  async updateReportStatus({
    reportId,
    status,
    reviewedBy,
  }: {
    reportId: string;
    status: MessageReportStatus;
    reviewedBy: string;
  }): Promise<MessageReport> {
    const reportRef = doc(getPromptFundFirestore(), chatSafetyCollections.messageReports, reportId);
    await setDoc(reportRef, {
      status,
      reviewedAt: nowIso(),
      reviewedBy,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const updated = await this.getReportById(reportId);
    if (!updated) {
      throw new AppError('Report not found.', 'chat/report-not-found');
    }
    return updated;
  },

  async permanentlyBanUser(userId: string, adminId: string): Promise<User | null> {
    return userService.updateUser(userId, { status: 'banned' });
  },

  async suspendUser(userId: string, _adminId: string): Promise<User | null> {
    return userService.updateUser(userId, { status: 'suspended' });
  },

  async deleteReport(reportId: string) {
    const reportRef = doc(getPromptFundFirestore(), chatSafetyCollections.messageReports, reportId);
    await deleteDoc(reportRef);
  },

  async deleteReportedMessage(messageId: string) {
    return firestoreAdapter.deleteById('discussionMessages', messageId);
  },
};
