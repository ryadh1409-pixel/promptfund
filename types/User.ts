export type UserRole = 'entrepreneur' | 'investor' | 'admin';
export type UserIntent = 'entrepreneur' | 'investor';
export type UserStatus = 'active' | 'suspended' | 'banned' | 'deleted';

export type User = {
  id: string;
  name: string;
  handle: string;
  displayName?: string;
  username?: string;
  photoURL?: string;
  role: UserRole;
  intent?: UserIntent;
  avatar: string;
  bio: string;
  location: string;
  stack: string[];
  trustScore: number;
  status?: UserStatus;
  verified?: boolean;
  memberSince?: string;
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
