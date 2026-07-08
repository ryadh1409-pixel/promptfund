import { doc, setDoc } from 'firebase/firestore';

import { blockDocumentId, blockedUserSubcollectionPath } from '@/firebase/chatSafety';
import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { userService, type BlockStatus } from '@/services/userService';
import type { BlockedUser } from '@/types/User';
import type { User } from '@/types/User';

function displayName(profile: Pick<User, 'displayName' | 'name' | 'username' | 'handle'>) {
  return profile.displayName ?? profile.name ?? profile.username ?? profile.handle ?? 'PromptFund Member';
}

function blockRole(profile: Pick<User, 'activeRole' | 'roles' | 'role'>): 'Founder' | 'Angel Investor' {
  const role = profile.activeRole ?? profile.roles?.[0] ?? profile.role;
  return role === 'founder' || role === 'entrepreneur' ? 'Founder' : 'Angel Investor';
}

/**
 * PromptFund stores blocks in the top-level `blockedUsers` collection for rules compatibility.
 * Each block is mirrored under `users/{uid}/blocked/{blockedUid}` for profile-level access.
 */
export const chatBlockService = {
  async blockUser({
    blocker,
    blocked,
  }: {
    blocker: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role'>;
    blocked: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role' | 'photoURL'>;
  }): Promise<BlockedUser> {
    const blockedUser = await userService.blockUser({ blocker, blocked });
    const mirrorPayload = {
      blockedUid: blocked.id,
      blockedName: displayName(blocked),
      blockedRole: blockRole(blocked),
      blockedPhotoURL: blocked.photoURL,
      createdAt: blockedUser.createdAt,
    };

    await setDoc(
      doc(getPromptFundFirestore(), blockedUserSubcollectionPath(blocker.id), blocked.id),
      mirrorPayload,
      { merge: true },
    );

    return blockedUser;
  },

  async unblockUser(blockerUid: string, blockedUid: string): Promise<void> {
    await userService.unblockUser(blockerUid, blockedUid);
    await setDoc(
      doc(getPromptFundFirestore(), blockedUserSubcollectionPath(blockerUid), blockedUid),
      { removedAt: new Date().toISOString() },
      { merge: true },
    );
  },

  getBlockStatus(currentUid: string, targetUid: string): Promise<BlockStatus> {
    return userService.getBlockStatus(currentUid, targetUid);
  },

  isBlockedBetween(firstUid: string, secondUid: string): Promise<boolean> {
    return userService.isBlockedBetween(firstUid, secondUid);
  },

  subscribeBlockStatus(
    currentUid: string,
    targetUid: string,
    onChange: (status: BlockStatus) => void,
    onError?: (error: unknown) => void,
  ) {
    return userService.subscribeBlockStatus(currentUid, targetUid, onChange, onError);
  },

  blockDocumentPath(blockerUid: string, blockedUid: string) {
    return `${firestoreCollections.blockedUsers}/${blockDocumentId(blockerUid, blockedUid)}`;
  },
};
