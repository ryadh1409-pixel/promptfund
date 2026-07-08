import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import { getPromptFundFirestore } from '@/firebase/firestore';
import { CHAT_MODERATION_BLOCKED_MESSAGE } from '@/firebase/chatSafety';
import { chatMessageService } from '@/services/chat/messageService';
import { AppError } from '@/services/errorHandler';
import { normalizeChatMessage } from '@/services/chat/chatMessageMapper';
import type { DiscussionRoom } from '@/types/InvestmentFlow';
import type { ChatMessage, ChatReaction } from '@/types/InvestmentChat';
import type { User } from '@/types/User';
import { moderateMessage } from '@/utils/chatModeration';
import { logChatUploadStep } from '@/utils/chatUpload';

export { normalizeChatMessage };

const PAGE_SIZE = 40;

function now() {
  return new Date().toISOString();
}

function sortMessagesChronologically(messages: ChatMessage[]) {
  return [...messages].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export const investmentChatService = {
  subscribeToRoom(roomId: string, onChange: (room: DiscussionRoom | null) => void, onError?: (error: unknown) => void): Unsubscribe {
    const reference = doc(getPromptFundFirestore(), 'discussionRooms', roomId);
    return onSnapshot(
      reference,
      (snapshot) => {
        onChange(snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as DiscussionRoom) : null);
      },
      (error) => onError?.(error),
    );
  },

  subscribeToMessages(
    roomId: string,
    onChange: (messages: ChatMessage[]) => void,
    onError?: (error: unknown) => void,
  ): Unsubscribe {
    const messagesQuery = query(
      collection(getPromptFundFirestore(), 'discussionMessages'),
      where('discussionRoomId', '==', roomId),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    );

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages = snapshot.docs
          .map((item) => normalizeChatMessage(item.id, item.data() as Record<string, unknown>));
        logChatUploadStep('6. Realtime listener received messages', {
          roomId,
          count: messages.length,
          latestType: messages.at(-1)?.type,
        });
        onChange(sortMessagesChronologically(messages));
      },
      (error) => onError?.(error),
    );
  },

  async loadOlderMessages(roomId: string, before: ChatMessage) {
    const messagesQuery = query(
      collection(getPromptFundFirestore(), 'discussionMessages'),
      where('discussionRoomId', '==', roomId),
      orderBy('createdAt', 'desc'),
      startAfter(before.createdAt),
      limit(PAGE_SIZE),
    );
    const snapshot = await getDocs(messagesQuery);
    return sortMessagesChronologically(
      snapshot.docs.map((item) => normalizeChatMessage(item.id, item.data() as Record<string, unknown>)),
    );
  },

  async markMessagesDelivered(room: DiscussionRoom, recipientId: string, messages: ChatMessage[]) {
    const pending = messages.filter(
      (message) => message.senderId !== recipientId
        && message.status !== 'delivered'
        && message.status !== 'read'
        && !message.deletedAt,
    );
    if (pending.length === 0) return;

    const deliveredAt = now();
    await Promise.all(pending.map((message) => updateDoc(
      doc(getPromptFundFirestore(), 'discussionMessages', message.id),
      { status: 'delivered', deliveredAt, updatedAt: serverTimestamp() },
    )));
  },

  async markMessagesRead(room: DiscussionRoom, readerId: string, messages: ChatMessage[]) {
    const readAt = now();
    const unread = messages.filter(
      (message) => message.senderId !== readerId && message.status !== 'read' && !message.deletedAt,
    );

    if (unread.length > 0) {
      await Promise.all(unread.map((message) => updateDoc(
        doc(getPromptFundFirestore(), 'discussionMessages', message.id),
        { status: 'read', readAt, deliveredAt: message.deliveredAt ?? readAt, updatedAt: serverTimestamp() },
      )));
    }

    await updateDoc(doc(getPromptFundFirestore(), 'discussionRooms', room.id), {
      readReceipts: {
        ...(room.readReceipts ?? {}),
        [readerId]: readAt,
      },
      unreadCounts: {
        ...(room.unreadCounts ?? {}),
        [readerId]: 0,
      },
      updatedAt: serverTimestamp(),
    });
  },

  async setTyping(room: DiscussionRoom, userId: string, isTyping: boolean) {
    return updateDoc(doc(getPromptFundFirestore(), 'discussionRooms', room.id), {
      typingBy: {
        ...(room.typingBy ?? {}),
        [userId]: isTyping,
      },
      updatedAt: serverTimestamp(),
    });
  },

  async updatePresence(room: DiscussionRoom, userId: string, isOnline: boolean) {
    return updateDoc(doc(getPromptFundFirestore(), 'discussionRooms', room.id), {
      presence: {
        ...(room as DiscussionRoom & { presence?: Record<string, { isOnline?: boolean; lastSeenAt?: string }> }).presence,
        [userId]: {
          isOnline,
          lastSeenAt: now(),
        },
      },
      updatedAt: serverTimestamp(),
    });
  },

  async editMessage(message: ChatMessage, editorId: string, nextText: string) {
    if (message.senderId !== editorId) {
      throw new AppError('You can only edit your own messages.', 'chat/forbidden-edit');
    }
    const trimmed = nextText.trim();
    if (!trimmed) {
      throw new AppError('Message cannot be empty.', 'chat/empty-message');
    }
    const moderation = moderateMessage(trimmed);
    if (!moderation.allowed) {
      throw new AppError(CHAT_MODERATION_BLOCKED_MESSAGE, 'moderation/blocked-message');
    }

    await updateDoc(doc(getPromptFundFirestore(), 'discussionMessages', message.id), {
      text: trimmed,
      body: trimmed,
      editedAt: now(),
      updatedAt: serverTimestamp(),
    });
  },

  async deleteMessage(message: ChatMessage, actorId: string, isAdmin = false) {
    return chatMessageService.softDeleteMessage(message, actorId, isAdmin);
  },

  async toggleReaction(message: ChatMessage, actorId: string, reaction: ChatReaction) {
    const reactions = { ...(message.reactions ?? {}) };
    const current = new Set(reactions[reaction] ?? []);
    if (current.has(actorId)) {
      current.delete(actorId);
    } else {
      current.add(actorId);
    }
    reactions[reaction] = Array.from(current);
    await updateDoc(doc(getPromptFundFirestore(), 'discussionMessages', message.id), {
      reactions,
      updatedAt: serverTimestamp(),
    });
  },

  async setPinned(room: DiscussionRoom, message: ChatMessage, pinned: boolean) {
    const pinnedMessageIds = pinned
      ? Array.from(new Set([...(room as DiscussionRoom & { pinnedMessageIds?: string[] }).pinnedMessageIds ?? [], message.id]))
      : ((room as DiscussionRoom & { pinnedMessageIds?: string[] }).pinnedMessageIds ?? []).filter((id) => id !== message.id);

    await Promise.all([
      updateDoc(doc(getPromptFundFirestore(), 'discussionMessages', message.id), {
        isPinned: pinned,
        updatedAt: serverTimestamp(),
      }),
      updateDoc(doc(getPromptFundFirestore(), 'discussionRooms', room.id), {
        pinnedMessageIds,
        updatedAt: serverTimestamp(),
      }),
    ]);
  },

  searchMessages(messages: ChatMessage[], search: string) {
    const queryText = search.trim().toLowerCase();
    if (!queryText) return messages;
    return messages.filter((message) => {
      const haystack = [
        message.text,
        message.senderName,
        ...(message.attachments ?? []).map((attachment) => attachment.name),
      ].join(' ').toLowerCase();
      return haystack.includes(queryText);
    });
  },
};

export type { DocumentSnapshot, QueryDocumentSnapshot };
