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
  updatedAt?: string;
};

export type CreateUserInput = Omit<User, 'id' | 'trustScore'> & {
  trustScore?: number;
};

export type UpdateUserInput = Partial<Omit<User, 'id'>>;

export type BlockedUser = {
  id: string;
  blockerUid: string;
  blockedUid: string;
  createdAt: string;
};

export type UserReport = {
  id: string;
  reporterUid: string;
  reportedUid: string;
  reason: 'Spam' | 'Fraud' | 'Harassment' | 'Abuse' | 'Scam' | 'Fake Startup' | 'Other' | string;
  details: string;
  status: 'open' | 'resolved';
  discussionRoomId?: string;
  startupId?: string;
  createdAt: string;
  resolvedAt?: string;
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

export type AdminAnnouncement = {
  id: string;
  title: string;
  body: string;
  target: 'everyone' | 'founders' | 'investors' | 'single_user';
  targetUserId?: string;
  sentBy: string;
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
    | 'funding_confirmed'
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
    | 'interest'
    | 'match'
    | 'discussion'
    | 'agreement_signed'
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
