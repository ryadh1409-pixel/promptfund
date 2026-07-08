import type { ChatMuteDuration } from '@/types/ChatSafety';

export const CHAT_SAFETY_THRESHOLDS = {
  HIDE_MESSAGE_REPORT_COUNT: 3,
  TEMP_SUSPEND_REPORT_COUNT: 10,
} as const;

export const CHAT_MODERATION_BLOCKED_MESSAGE = 'Please keep the conversation professional.';

export const CHAT_COMPLIANCE_BANNER =
  'Messages are encrypted in transit. PromptFund administrators may review conversations that are reported for fraud prevention, abuse prevention, and dispute resolution.';

export const MESSAGE_REPORT_REASONS = [
  'Harassment',
  'Hate Speech',
  'Scam / Fraud',
  'Spam',
  'Sexual Content',
  'Threats',
  'Other',
] as const;

export const chatSafetyCollections = {
  messageReports: 'messageReports',
  blockedUsers: 'blockedUsers',
} as const;

export function messageReportDocumentId(messageId: string, reporterId: string) {
  return `${messageId}_${reporterId}`;
}

export function blockDocumentId(blockerUid: string, blockedUid: string) {
  return `${blockerUid}_${blockedUid}`;
}

export function blockedUserSubcollectionPath(userId: string) {
  return `users/${userId}/blocked`;
}

export function muteDurationToExpiry(duration: ChatMuteDuration, from = new Date()) {
  if (duration === 'forever') {
    return 'forever';
  }

  const expiry = new Date(from);
  if (duration === '8_hours') {
    expiry.setHours(expiry.getHours() + 8);
  } else {
    expiry.setHours(expiry.getHours() + 24);
  }
  return expiry.toISOString();
}

export function isMuteActive(mutedUntil: string | undefined | null, now = new Date()) {
  if (!mutedUntil) return false;
  if (mutedUntil === 'forever') return true;
  return new Date(mutedUntil).getTime() > now.getTime();
}
