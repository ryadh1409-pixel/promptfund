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
    const path = `users/${userId}`;

    try {
      console.info('[PromptFund UserService] createUser start', { uid: userId, path });
      const user = await firestoreAdapter.setWithId<Omit<User, 'id'>>('users', userId, {
        ...input,
        trustScore: input.trustScore ?? 50,
      });
      console.info('[PromptFund UserService] createUser success', { uid: userId, path });
      return user;
    } catch (error) {
      console.error('[PromptFund UserService] createUser failure', { uid: userId, path, error });
      throw error;
    }
  },

  async updateUser(userId: string, input: UpdateUserInput): Promise<User | null> {
    return firestoreAdapter.update<User>('users', userId, input);
  },
};
