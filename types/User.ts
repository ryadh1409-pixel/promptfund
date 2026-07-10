export type ActiveRole = 'founder' | 'investor';
export type UserRole = ActiveRole | 'angel_investor' | 'entrepreneur' | 'admin';
export type UserIntent = ActiveRole;
export type UserStatus = 'active' | 'suspended' | 'banned' | 'deleted';
export type PreferredPayoutMethod = 'interac' | 'wise' | 'paypal' | 'bank';

export type User = {
  id: string;
  name: string;
  handle: string;
  displayName?: string;
  username?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  website?: string;
  shareFundingContactInfo?: boolean;
  photoURL?: string;
  role: UserRole;
  roles?: ActiveRole[];
  activeRole?: ActiveRole;
  intent?: UserIntent;
  hasChosenPath?: boolean;
  avatar: string;
  bio: string;
  location: string;
  stack: string[];
  trustScore: number;
  reportedCount?: number;
  status?: UserStatus;
  verified?: boolean;
  memberSince?: string;
  preferredPayoutMethod?: PreferredPayoutMethod;
  interacEmail?: string;
  wiseEmail?: string;
  paypalEmail?: string;
  bankName?: string;
  accountHolderName?: string;
  accountLast4?: string;
  legalOnboardingRequired?: boolean;
  legalAcceptance?: LegalAcceptance;
  updatedAt?: string;
};

export type CreateUserInput = Omit<User, 'id' | 'trustScore' | 'stack'> & {
  trustScore?: number;
  stack?: string[];
};

export type UpdateUserInput = Partial<Omit<User, 'id'>>;

export type LegalDocumentVersions = {
  appVersion: string;
  termsVersion: string;
  privacyVersion: string;
  communityVersion: string;
};

export type LegalAcceptance = LegalDocumentVersions & {
  accepted: true;
  acceptedAt: unknown;
};

export type BlockedUser = {
  id: string;
  blockerUid: string;
  blockedUid: string;
  blockerName: string;
  blockedName: string;
  blockerRole: 'Founder' | 'Angel Investor';
  blockedRole: 'Founder' | 'Angel Investor';
  blockedPhotoURL?: string;
  createdAt: string;
};

export type UserReport = {
  id: string;
  reporterUid: string;
  reportedUid: string;
  reason: 'Spam' | 'Fraud' | 'Harassment' | 'Abuse' | 'Scam' | 'Fake Startup' | 'Other' | string;
  details: string;
  status: 'open' | 'dismissed' | 'resolved';
  discussionRoomId?: string;
  startupId?: string;
  messageId?: string;
  createdAt: string;
  resolvedAt?: string;
  reviewedBy?: string;
};

export type DiscussionReportReason =
  | 'Spam'
  | 'Scam or Fraud'
  | 'Bad language'
  | 'False Investment Information'
  | 'Other';

export type DiscussionReport = {
  id: string;
  reporterUid: string;
  reportedUid: string;
  discussionRoomId: string;
  reason: DiscussionReportReason;
  details: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
};

export type ModerationFlag = {
  id: string;
  userId: string;
  discussionRoomId?: string;
  messagePreview: string;
  categories: string[];
  status: 'open' | 'reviewed';
  createdAt: string;
};

export type SupportTicketCategory =
  | 'Account'
  | 'Verification'
  | 'Funding'
  | 'Investments'
  | 'Payments'
  | 'Technical Issue'
  | 'Report a User'
  | 'Report a Bug'
  | 'Feature Request'
  | 'Other';

export type SupportTicketStatus = 'Open' | 'Waiting for User' | 'In Progress' | 'Resolved' | 'Closed';

export type SupportTicketAttachment = {
  name: string;
  path: string;
  downloadUrl: string;
  contentType: string;
};

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: SupportTicketCategory;
  message: string;
  attachments: SupportTicketAttachment[];
  status: SupportTicketStatus;
  priority: 'Normal';
  unreadByAdmin: boolean;
  unreadByUser: boolean;
  lastMessageAt?: unknown;
  createdAt: unknown;
  updatedAt: unknown;
};

export type SupportTicketMessage = {
  id: string;
  senderId: string;
  senderRole: 'user' | 'admin';
  text: string;
  attachments: SupportTicketAttachment[];
  createdAt: unknown;
};

export type AdminAnnouncement = {
  id: string;
  title: string;
  body: string;
  target: 'everyone' | 'founders' | 'investors' | 'single_user';
  targetUserId?: string;
  createdBy: string;
  sentBy?: string;
  readBy?: string[];
  createdAt: string;
};

export type ActivityTimelineEvent = {
  id: string;
  startupId?: string;
  discussionRoomId?: string;
  agreementId?: string;
  actorId: string;
  eventType:
    | 'interest_received'
    | 'match_created'
    | 'discussion_started'
    | 'agreement_signed'
    | 'funding_instructions_opened'
    | 'funding_confirmed'
    | 'milestone_completed'
    | 'revenue_updated'
    | 'completed'
    | 'cancelled'
    | 'archived'
    | 'admin_action';
  label: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type:
    | 'message'
    | 'agreement_accepted'
    | 'funding_confirmed'
    | 'admin_announcement'
    | 'startup'
    | 'interest'
    | 'match'
    | 'discussion'
    | 'agreement_signed'
    | 'founder_update'
    | 'comment'
    | 'milestone_completed'
    | 'revenue_updated'
    | 'report'
    | 'block'
    | 'startup_archived';
  readAt?: string;
  data?: Record<string, string>;
  createdAt: string;
};

export type PushToken = {
  id: string;
  userId: string;
  token: string;
  platform?: string;
  updatedAt: string;
};
