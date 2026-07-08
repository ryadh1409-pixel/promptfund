import { doc, getDoc } from 'firebase/firestore';

import { CHAT_MODERATION_BLOCKED_MESSAGE } from '@/firebase/chatSafety';
import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { AppError } from '@/services/errorHandler';
import { chatBlockService } from '@/services/chat/blockService';
import { chatMuteService } from '@/services/chat/muteService';
import type { DiscussionRoom } from '@/types/InvestmentFlow';
import type { ChatAttachment } from '@/types/InvestmentChat';
import type { User } from '@/types/User';
import type { LocalChatAttachmentInput } from '@/utils/chatAttachments';
import { moderateMessage } from '@/utils/chatModeration';

export type ValidateSendMessageInput = {
  roomId: string;
  senderId: string;
  text: string;
  localAttachments?: LocalChatAttachmentInput[];
  attachments?: ChatAttachment[];
};

export type ValidateSendMessageResult = {
  trimmedText: string;
  recipientId: string;
  room: DiscussionRoom;
};

export async function validateSendMessage({
  roomId,
  senderId,
  text,
  localAttachments = [],
  attachments = [],
}: ValidateSendMessageInput): Promise<ValidateSendMessageResult> {
  const trimmedText = text.trim();
  const hasLocalAttachments = localAttachments.length > 0;
  const hasUploadedAttachments = attachments.length > 0;

  // A. Validate message
  if (!trimmedText && !hasLocalAttachments && !hasUploadedAttachments) {
    throw new AppError('Write a message or attach a file before sending.', 'chat/empty-message');
  }

  const roomSnapshot = await getDoc(doc(getPromptFundFirestore(), firestoreCollections.discussionRooms, roomId));

  let recipientId: string | null = null;
  if (roomSnapshot.exists()) {
    const roomData = roomSnapshot.data() as DiscussionRoom;
    if (roomData.founderId === senderId) {
      recipientId = roomData.investorId;
    } else if (roomData.investorId === senderId) {
      recipientId = roomData.founderId;
    }
  }

  // B & C. Fresh block checks before room availability validation.
  if (recipientId) {
    const blockStatus = await chatBlockService.getBlockStatus(senderId, recipientId);

    // B. Check if current user blocked receiver
    if (blockStatus.blockedByMe) {
      throw new AppError('You have blocked this user. Unblock them to send messages.', 'chat/blocked-by-me');
    }

    // C. Check if receiver blocked current user
    if (blockStatus.blockedMe) {
      throw new AppError('This user has blocked you. You cannot send messages.', 'chat/blocked-me');
    }
  }

  // D. Check if conversation still exists
  if (!roomSnapshot.exists()) {
    throw new AppError('This conversation is no longer available.', 'chat/room-not-found');
  }

  const room = { ...roomSnapshot.data(), id: roomSnapshot.id } as DiscussionRoom;

  if (room.founderId !== senderId && room.investorId !== senderId) {
    throw new AppError('You are not a participant in this conversation.', 'chat/forbidden-participant');
  }

  if (chatMuteService.isConversationHidden(room, senderId)) {
    throw new AppError('This conversation is no longer available.', 'chat/room-hidden');
  }

  const resolvedRecipientId = senderId === room.founderId ? room.investorId : room.founderId;

  // E. Check moderation
  if (trimmedText) {
    const moderation = moderateMessage(trimmedText);
    if (!moderation.allowed) {
      throw new AppError(CHAT_MODERATION_BLOCKED_MESSAGE, 'moderation/blocked-message');
    }
  }

  return {
    trimmedText,
    recipientId: resolvedRecipientId,
    room,
  };
}

export function assertSenderProfile(sender: Pick<User, 'id'> | null | undefined) {
  if (!sender?.id) {
    throw new AppError('You must be signed in to send messages.', 'chat/unauthorized');
  }
}
