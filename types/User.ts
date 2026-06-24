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
  reason: string;
  details: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
};
