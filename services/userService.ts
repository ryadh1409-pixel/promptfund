import { firestoreAdapter } from '@/firebase/firestore';
import { deleteUserProfilePhoto, uploadUserProfilePhoto } from '@/firebase/storage';
import type { BlockedUser, CreateUserInput, UpdateUserInput, User, UserReport } from '@/types/User';

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
        displayName: input.displayName ?? input.name,
        username: input.username ?? input.handle,
        status: input.status ?? 'active',
        verified: input.verified ?? false,
        memberSince: input.memberSince ?? new Date().toISOString(),
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

  async updateProfile(
    userId: string,
    input: Pick<UpdateUserInput, 'displayName' | 'username' | 'photoURL' | 'bio' | 'location'>,
  ): Promise<User | null> {
    const payload: UpdateUserInput = {
      ...input,
      updatedAt: new Date().toISOString(),
    };

    if (input.displayName) {
      payload.name = input.displayName;
    }

    if (input.username) {
      payload.handle = input.username;
    }

    return firestoreAdapter.update<User>('users', userId, payload);
  },

  async uploadProfilePhoto(userId: string, uri: string): Promise<string> {
    const upload = await uploadUserProfilePhoto({ userId, uri });
    await this.updateProfile(userId, { photoURL: upload.downloadUrl });
    return upload.downloadUrl;
  },

  async deleteProfile(userId: string): Promise<void> {
    await deleteUserProfilePhoto(userId);
    await firestoreAdapter.deleteById('users', userId);
  },

  async blockUser(blockerUid: string, blockedUid: string): Promise<BlockedUser> {
    const blockId = `${blockerUid}_${blockedUid}`;

    return firestoreAdapter.setWithId<Omit<BlockedUser, 'id'>>('blockedUsers', blockId, {
      blockerUid,
      blockedUid,
      createdAt: new Date().toISOString(),
    });
  },

  async listBlockedUsers(blockerUid: string): Promise<BlockedUser[]> {
    return firestoreAdapter.queryByField<BlockedUser>('blockedUsers', 'blockerUid', blockerUid);
  },

  async isBlockedBetween(firstUid: string, secondUid: string): Promise<boolean> {
    const [firstBlocks, secondBlocks] = await Promise.all([
      firestoreAdapter.getById<BlockedUser>('blockedUsers', `${firstUid}_${secondUid}`),
      firestoreAdapter.getById<BlockedUser>('blockedUsers', `${secondUid}_${firstUid}`),
    ]);

    return Boolean(firstBlocks || secondBlocks);
  },

  async reportUser(input: Omit<UserReport, 'id' | 'status' | 'createdAt'>): Promise<UserReport> {
    return firestoreAdapter.create<Omit<UserReport, 'id'>>('userReports', {
      ...input,
      status: 'open',
      createdAt: new Date().toISOString(),
    });
  },
};
