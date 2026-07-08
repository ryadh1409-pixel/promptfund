export type MessageReportReason =
  | 'Harassment'
  | 'Hate Speech'
  | 'Scam / Fraud'
  | 'Spam'
  | 'Sexual Content'
  | 'Threats'
  | 'Other';

export type MessageReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'approved';

export type MessageReport = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  roomId: string;
  messageId: string;
  reason: MessageReportReason;
  details?: string;
  createdAt: string;
  status: MessageReportStatus;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type ChatMuteDuration = '8_hours' | '24_hours' | 'forever';

export type ModerationResult = {
  allowed: boolean;
  reason?: string;
};

export type ChatToastType = 'success' | 'error' | 'info';

export type ChatToastPayload = {
  type: ChatToastType;
  message: string;
};
