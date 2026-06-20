export type UserRole = 'developer' | 'investor';

export type User = {
  id: string;
  name: string;
  handle: string;
  role: UserRole;
  avatar: string;
  bio: string;
  location: string;
  stack: string[];
  trustScore: number;
};

export type CreateUserInput = Omit<User, 'id' | 'trustScore'> & {
  trustScore?: number;
};

export type UpdateUserInput = Partial<Omit<User, 'id'>>;
