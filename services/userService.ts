import { collection, doc, onSnapshot, query, setDoc, where, type Unsubscribe } from 'firebase/firestore';

import { firestoreAdapter, firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { deleteUserProfilePhoto, uploadUserProfilePhoto } from '@/firebase/storage';
import type { BlockedUser, CreateUserInput, DiscussionReport, DiscussionReportReason, UpdateUserInput, User, UserReport } from '@/types/User';
import { getRoleTitle } from '@/utils/roles';

export type BlockStatus = {
  blockedByMe: boolean;
  blockedMe: boolean;
  myBlock?: BlockedUser;
  theirBlock?: BlockedUser;
};

function blockId(blockerUid: string, blockedUid: string) {
  return `${blockerUid}_${blockedUid}`;
}

function discussionReportId(discussionRoomId: string, reporterUid: string) {
  return `${discussionRoomId}_${reporterUid}`;
}

function displayName(profile: Pick<User, 'displayName' | 'name' | 'username' | 'handle'>) {
  return profile.displayName ?? profile.name ?? profile.username ?? profile.handle ?? 'Ai PromptFund Member';
}

function blockRole(profile: Pick<User, 'activeRole' | 'roles' | 'role'>): 'Founder' | 'Angel Investor' {
  return getRoleTitle(profile.activeRole ?? profile.roles?.[0] ?? profile.role) === 'Founder' ? 'Founder' : 'Angel Investor';
}

function getFirebaseErrorDetails(error: unknown) {
  if (error && typeof error === 'object') {
    const record = error as { code?: string; message?: string };
    return {
      code: record.code ?? 'unknown',
      message: record.message ?? String(error),
    };
  }

  return {
    code: 'unknown',
    message: String(error),
  };
}

const userProfileCache = new Map<string, User | null>();
const userProfileInFlight = new Map<string, Promise<User | null>>();

async function runDeleteAccountOperation<T>(
  operation: string,
  path: string,
  fn: () => Promise<T>,
): Promise<T> {
  console.info('[PromptFund DeleteAccount]', { operation, path, status: 'start' });
  try {
    const result = await fn();
    console.info('[PromptFund DeleteAccount]', { operation, path, status: 'success', success: true });
    return result;
  } catch (error) {
    const { code, message } = getFirebaseErrorDetails(error);
    console.error('[PromptFund DeleteAccount]', {
      operation,
      path,
      status: 'error',
      success: false,
      errorCode: code,
      errorMessage: message,
    });
    throw error;
  }
}

export const userService = {
  async listUsers(): Promise<User[]> {
    return firestoreAdapter.list<User>('users');
  },

  async getUserById(userId: string): Promise<User | null> {
    if (userProfileCache.has(userId)) {
      return userProfileCache.get(userId) ?? null;
    }

    const inFlight = userProfileInFlight.get(userId);
    if (inFlight) {
      return inFlight;
    }

    const request = firestoreAdapter.getById<User>('users', userId)
      .then((user) => {
        userProfileCache.set(userId, user);
        userProfileInFlight.delete(userId);
        return user;
      })
      .catch((error) => {
        userProfileInFlight.delete(userId);
        throw error;
      });
    userProfileInFlight.set(userId, request);
    return request;
  },

  async createUser(userId: string, input: CreateUserInput): Promise<User> {
    const path = `users/${userId}`;

    try {
      console.info('[PromptFund UserService] createUser start', { uid: userId, path });
      const { stack, ...profileFields } = input;
      const payload = {
        ...profileFields,
        displayName: input.displayName ?? input.name,
        username: input.username ?? input.handle,
        status: input.status ?? 'active',
        verified: input.verified ?? false,
        memberSince: input.memberSince ?? new Date().toISOString(),
        trustScore: input.trustScore ?? 50,
        ...(stack !== undefined ? { stack } : {}),
      } as Omit<User, 'id'>;
      const user = await firestoreAdapter.setWithId<Omit<User, 'id'>>('users', userId, payload);
      userProfileCache.set(userId, user as User);
      console.info('[PromptFund UserService] createUser success', { uid: userId, path });
      return { ...user, stack: user.stack ?? [] };
    } catch (error) {
      console.error('[PromptFund UserService] createUser failure', { uid: userId, path, error });
      throw error;
    }
  },

  async updateUser(userId: string, input: UpdateUserInput): Promise<User | null> {
    const updated = await firestoreAdapter.update<User>('users', userId, input);
    userProfileCache.set(userId, updated);
    return updated;
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

    const updated = await firestoreAdapter.update<User>('users', userId, payload);
    userProfileCache.set(userId, updated);
    return updated;
  },

  async uploadProfilePhoto(userId: string, uri: string): Promise<string> {
    const upload = await uploadUserProfilePhoto({ userId, uri });
    await this.updateProfile(userId, { photoURL: upload.downloadUrl });
    return upload.downloadUrl;
  },

  async deleteAccount(userId: string): Promise<void> {
    await deleteUserProfilePhoto(userId);
    await runDeleteAccountOperation(
      'deleteDoc',
      `users/${userId}`,
      () => firestoreAdapter.deleteById('users', userId),
    );
    userProfileCache.delete(userId);
    userProfileInFlight.delete(userId);
  },

  async deleteProfile(userId: string): Promise<void> {
    await this.deleteAccount(userId);
  },

  async blockUser({
    blocker,
    blocked,
  }: {
    blocker: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role'>;
    blocked: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role' | 'photoURL'>;
  }): Promise<BlockedUser> {
    const id = blockId(blocker.id, blocked.id);
    const existingStatus = await this.getBlockStatus(blocker.id, blocked.id);
    const payload: Omit<BlockedUser, 'id'> = {
      blockerUid: blocker.id,
      blockedUid: blocked.id,
      blockerName: displayName(blocker),
      blockedName: displayName(blocked),
      blockerRole: blockRole(blocker),
      blockedRole: blockRole(blocked),
      createdAt: new Date().toISOString(),
    };
    if (blocked.photoURL) {
      payload.blockedPhotoURL = blocked.photoURL;
    }
    if (
      existingStatus.myBlock
      && existingStatus.myBlock.blockedName
      && existingStatus.myBlock.blockerName
      && existingStatus.myBlock.blockedRole
      && existingStatus.myBlock.blockerRole
    ) {
      return existingStatus.myBlock;
    }

    await setDoc(doc(getPromptFundFirestore(), firestoreCollections.blockedUsers, id), payload);
    return { ...payload, id };
  },

  async unblockUser(blockerUid: string, blockedUid: string): Promise<void> {
    await firestoreAdapter.deleteById('blockedUsers', blockId(blockerUid, blockedUid));
  },

  async getBlockStatus(currentUid: string, targetUid: string): Promise<BlockStatus> {
    const [myBlock, theirBlock] = await Promise.all([
      firestoreAdapter.getById<BlockedUser>('blockedUsers', blockId(currentUid, targetUid)),
      firestoreAdapter.getById<BlockedUser>('blockedUsers', blockId(targetUid, currentUid)),
    ]);

    return {
      blockedByMe: Boolean(myBlock),
      blockedMe: Boolean(theirBlock),
      myBlock: myBlock ?? undefined,
      theirBlock: theirBlock ?? undefined,
    };
  },

  async isBlockedBetween(firstUid: string, secondUid: string): Promise<boolean> {
    const status = await this.getBlockStatus(firstUid, secondUid);
    return status.blockedByMe || status.blockedMe;
  },

  subscribeBlockStatus(currentUid: string, targetUid: string, onChange: (status: BlockStatus) => void, onError?: (error: unknown) => void): Unsubscribe {
    const database = getPromptFundFirestore();
    let myBlock: BlockedUser | undefined;
    let theirBlock: BlockedUser | undefined;

    const emit = () => {
      onChange({
        blockedByMe: Boolean(myBlock),
        blockedMe: Boolean(theirBlock),
        myBlock,
        theirBlock,
      });
    };

    const unsubscribeMine = onSnapshot(
      doc(database, firestoreCollections.blockedUsers, blockId(currentUid, targetUid)),
      (snapshot) => {
        myBlock = snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as BlockedUser) : undefined;
        emit();
      },
      onError,
    );
    const unsubscribeTheirs = onSnapshot(
      doc(database, firestoreCollections.blockedUsers, blockId(targetUid, currentUid)),
      (snapshot) => {
        theirBlock = snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as BlockedUser) : undefined;
        emit();
      },
      onError,
    );

    return () => {
      unsubscribeMine();
      unsubscribeTheirs();
    };
  },

  subscribeBlockedUsers(blockerUid: string, onChange: (blockedUsers: BlockedUser[]) => void, onError?: (error: unknown) => void): Unsubscribe {
    const blocksQuery = query(
      collection(getPromptFundFirestore(), firestoreCollections.blockedUsers),
      where('blockerUid', '==', blockerUid),
    );

    return onSnapshot(
      blocksQuery,
      (snapshot) => {
        const blocks = snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as BlockedUser)
          .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
        onChange(blocks);
      },
      onError,
    );
  },

  async reportUser(input: Omit<UserReport, 'id' | 'status' | 'createdAt'>): Promise<UserReport> {
    return firestoreAdapter.create<Omit<UserReport, 'id'>>('userReports', {
      ...input,
      status: 'open',
      createdAt: new Date().toISOString(),
    });
  },

  async submitDiscussionReport(input: {
    reporterUid: string;
    reportedUid: string;
    discussionRoomId: string;
    reason: DiscussionReportReason;
    details: string;
  }): Promise<{ report: DiscussionReport; alreadyExists: boolean }> {
    const id = discussionReportId(input.discussionRoomId, input.reporterUid);
    const existing = await firestoreAdapter.getById<DiscussionReport>('reports', id);
    if (existing) {
      return { report: existing, alreadyExists: true };
    }

    const payload: Omit<DiscussionReport, 'id'> = {
      ...input,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(getPromptFundFirestore(), firestoreCollections.reports, id), payload);
    return { report: { ...payload, id }, alreadyExists: false };
  },
};
