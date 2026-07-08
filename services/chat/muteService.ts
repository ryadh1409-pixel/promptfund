import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { isMuteActive, muteDurationToExpiry } from '@/firebase/chatSafety';
import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import type { DiscussionRoom } from '@/types/InvestmentFlow';
import type { ChatMuteDuration } from '@/types/ChatSafety';

export const chatMuteService = {
  async muteConversation(roomId: string, userId: string, duration: ChatMuteDuration): Promise<void> {
    const roomRef = doc(getPromptFundFirestore(), firestoreCollections.discussionRooms, roomId);
    const mutedUntil = muteDurationToExpiry(duration);
    await updateDoc(roomRef, {
      [`mutedUntil.${userId}`]: mutedUntil,
      updatedAt: serverTimestamp(),
    });
  },

  async unmuteConversation(roomId: string, userId: string): Promise<void> {
    const roomRef = doc(getPromptFundFirestore(), firestoreCollections.discussionRooms, roomId);
    await updateDoc(roomRef, {
      [`mutedUntil.${userId}`]: null,
      updatedAt: serverTimestamp(),
    });
  },

  isConversationMuted(room: DiscussionRoom, userId: string): boolean {
    const mutedUntil = room.mutedUntil?.[userId];
    return isMuteActive(mutedUntil);
  },

  async deleteConversationForUser(roomId: string, userId: string): Promise<void> {
    const roomRef = doc(getPromptFundFirestore(), firestoreCollections.discussionRooms, roomId);
    await updateDoc(roomRef, {
      [`leftBy.${userId}`]: true,
      [`hiddenFor.${userId}`]: true,
      updatedAt: serverTimestamp(),
    });
  },

  isConversationHidden(room: DiscussionRoom, userId: string): boolean {
    return room.hiddenFor?.[userId] === true || room.leftBy?.[userId] === true;
  },
};
