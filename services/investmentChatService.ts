import {
  addDoc,
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
import { AppError } from '@/services/errorHandler';
import { notificationService } from '@/services/notificationService';
import { userService, type BlockStatus } from '@/services/userService';
import type { DiscussionRoom } from '@/types/InvestmentFlow';
import type { ChatAttachment, ChatMessage, ChatReaction, ChatSenderRole } from '@/types/InvestmentChat';
import type { User } from '@/types/User';
import { moderateChatMessage } from '@/utils/chatModeration';
import { buildOutgoingMessageFields, logChatUploadStep, resolveIncomingMessageType } from '@/utils/chatUpload';

const PAGE_SIZE = 40;

function now() {
  return new Date().toISOString();
}

function displayName(profile: Pick<User, 'displayName' | 'name' | 'username' | 'handle'> | null | undefined) {
  return profile?.displayName ?? profile?.name ?? profile?.username ?? profile?.handle ?? 'PromptFund Member';
}

function omitUndefined<T extends object>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

function resolveSenderRole(room: DiscussionRoom, senderId: string): ChatSenderRole {
  if (senderId === room.founderId) return 'founder';
  if (senderId === room.investorId) return 'investor';
  return 'system';
}

function readMessageText(data: Record<string, unknown>) {
  const fromText = typeof data.text === 'string' ? data.text.trim() : '';
  const fromBody = typeof data.body === 'string' ? data.body.trim() : '';
  return fromText || fromBody || '';
}

export function normalizeChatMessage(id: string, data: Record<string, unknown>): ChatMessage {
  const attachments = Array.isArray(data.attachments) ? data.attachments as ChatAttachment[] : [];
  const legacyImage = typeof data.imageUrl === 'string' && data.imageUrl.trim() ? data.imageUrl : undefined;
  const legacyDocumentUrl = typeof data.documentUrl === 'string' && data.documentUrl.trim() ? data.documentUrl : undefined;
  const legacyDocumentName = typeof data.documentName === 'string' ? data.documentName : undefined;
  const text = readMessageText(data);
  const roomId = String(data.roomId ?? data.discussionRoomId ?? '');

  const normalizedAttachments = [...attachments];
  if (legacyImage && !normalizedAttachments.some((item) => item.url === legacyImage)) {
    normalizedAttachments.push({
      id: `legacy-image-${id}`,
      name: 'Image',
      url: legacyImage,
      mimeType: 'image/jpeg',
      kind: 'image',
    });
  }
  if (legacyDocumentUrl && !normalizedAttachments.some((item) => item.url === legacyDocumentUrl)) {
    normalizedAttachments.push({
      id: `legacy-doc-${id}`,
      name: legacyDocumentName ?? 'Document',
      url: legacyDocumentUrl,
      mimeType: 'application/pdf',
      kind: 'document',
    });
  }

  const messageType = resolveIncomingMessageType(data, normalizedAttachments);
  const attachmentUrl = typeof data.attachmentUrl === 'string' && data.attachmentUrl.trim()
    ? data.attachmentUrl
    : messageType === 'text' || messageType === 'system'
      ? undefined
      : normalizedAttachments[0]?.url;
  const thumbnailUrl = typeof data.thumbnailUrl === 'string' && data.thumbnailUrl.trim()
    ? data.thumbnailUrl
    : (normalizedAttachments[0]?.kind === 'image' ? normalizedAttachments[0]?.url : undefined);

  return {
    id,
    roomId,
    discussionRoomId: roomId,
    senderId: String(data.senderId ?? ''),
    senderRole: (data.senderRole as ChatSenderRole) ?? 'founder',
    senderName: String(data.senderName ?? 'Member'),
    text,
    body: text,
    attachments: normalizedAttachments,
    createdAt: String(data.createdAt ?? now()),
    editedAt: typeof data.editedAt === 'string' ? data.editedAt : undefined,
    deletedAt: typeof data.deletedAt === 'string' ? data.deletedAt : undefined,
    deliveredAt: typeof data.deliveredAt === 'string' ? data.deliveredAt : undefined,
    readAt: typeof data.readAt === 'string' ? data.readAt : undefined,
    status: (data.status as ChatMessage['status']) ?? 'sent',
    replyTo: typeof data.replyTo === 'string' ? data.replyTo : undefined,
    reactions: typeof data.reactions === 'object' && data.reactions !== null
      ? data.reactions as Record<string, string[]>
      : undefined,
    isPinned: data.isPinned === true,
    type: messageType,
    attachmentUrl,
    thumbnailUrl,
    imageUrl: legacyImage,
    documentUrl: legacyDocumentUrl,
    documentName: legacyDocumentName,
    linkUrl: typeof data.linkUrl === 'string' ? data.linkUrl : undefined,
  };
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

  async sendMessage({
    room,
    sender,
    text,
    attachments = [],
    replyTo,
    blockStatus,
  }: {
    room: DiscussionRoom;
    sender: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle'>;
    text: string;
    attachments?: ChatAttachment[];
    replyTo?: string;
    blockStatus?: BlockStatus;
  }) {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) {
      throw new AppError('Write a message or attach a file before sending.', 'chat/empty-message');
    }

    const moderation = moderateChatMessage(trimmed);
    if (!moderation.allowed) {
      throw new AppError('This message violates PromptFund Community Guidelines.', 'moderation/blocked-message');
    }

    const recipientId = sender.id === room.founderId ? room.investorId : room.founderId;
    const isBlocked = blockStatus
      ? blockStatus.blockedByMe || blockStatus.blockedMe
      : await userService.isBlockedBetween(sender.id, recipientId);
    if (isBlocked) {
      throw new AppError('You cannot message this user because one of you has blocked the other.', 'chat/blocked-user');
    }

    const createdAt = now();
    const senderRole = resolveSenderRole(room, sender.id);
    const messageFields = buildOutgoingMessageFields(trimmed, attachments);
    const payload = omitUndefined({
      roomId: room.id,
      discussionRoomId: room.id,
      senderId: sender.id,
      senderRole,
      senderName: displayName(sender),
      text: messageFields.text,
      body: messageFields.text,
      type: messageFields.type,
      attachmentUrl: messageFields.attachmentUrl,
      thumbnailUrl: messageFields.thumbnailUrl,
      attachments: messageFields.attachments,
      createdAt,
      status: 'sent' as const,
      replyTo,
      reactions: {},
      isPinned: false,
    });

    logChatUploadStep('5. Creating Firestore message document', {
      roomId: room.id,
      type: messageFields.type,
      attachmentUrl: messageFields.attachmentUrl,
      attachmentCount: attachments.length,
    });

    const messageReference = await addDoc(collection(getPromptFundFirestore(), 'discussionMessages'), payload);
    logChatUploadStep('5. Firestore message created', { messageId: messageReference.id });

    await updateDoc(doc(getPromptFundFirestore(), 'discussionRooms', room.id), {
      lastMessage: trimmed || attachments[0]?.name || 'Attachment',
      lastMessageAt: createdAt,
      lastMessageSenderId: sender.id,
      unreadCounts: {
        ...(room.unreadCounts ?? {}),
        [recipientId]: (room.unreadCounts?.[recipientId] ?? 0) + 1,
        [sender.id]: 0,
      },
      readReceipts: {
        ...(room.readReceipts ?? {}),
        [sender.id]: createdAt,
      },
      updatedAt: serverTimestamp(),
    });

    notificationService.createNotification({
      userId: recipientId,
      title: 'New Investment Chat message',
      body: `${displayName(sender)}: ${(trimmed || attachments[0]?.name || 'Sent an attachment').slice(0, 120)}`,
      type: 'message',
      data: { discussionRoomId: room.id },
    }).catch((error) => console.info('[PromptFund Chat] notification failed', error));

    return normalizeChatMessage(messageReference.id, payload);
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
    const moderation = moderateChatMessage(trimmed);
    if (!moderation.allowed) {
      throw new AppError('This message violates PromptFund Community Guidelines.', 'moderation/blocked-message');
    }

    await updateDoc(doc(getPromptFundFirestore(), 'discussionMessages', message.id), {
      text: trimmed,
      body: trimmed,
      editedAt: now(),
      updatedAt: serverTimestamp(),
    });
  },

  async deleteMessage(message: ChatMessage, actorId: string, isAdmin = false) {
    if (!isAdmin && message.senderId !== actorId) {
      throw new AppError('You can only delete your own messages.', 'chat/forbidden-delete');
    }
    await updateDoc(doc(getPromptFundFirestore(), 'discussionMessages', message.id), {
      deletedAt: now(),
      text: '',
      body: '',
      updatedAt: serverTimestamp(),
    });
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
