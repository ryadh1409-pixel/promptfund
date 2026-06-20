import { firestoreAdapter } from '@/firebase/firestore';
import type { CreateUserInput, UpdateUserInput, User } from '@/types/User';

export const userService = {
  async listUsers(): Promise<User[]> {
    return firestoreAdapter.list<User>('users');
  },

  async getUserById(userId: string): Promise<User | null> {
    return firestoreAdapter.getById<User>('users', userId);
  },

  async createUser(userId: string, input: CreateUserInput): Promise<User> {
    return firestoreAdapter.setWithId<Omit<User, 'id'>>('users', userId, {
      ...input,
      trustScore: input.trustScore ?? 50,
    });
  },

  async updateUser(userId: string, input: UpdateUserInput): Promise<User | null> {
    return firestoreAdapter.update<User>('users', userId, input);
  },
};
