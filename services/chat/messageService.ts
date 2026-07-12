import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import {
  uploadDiscussionDocumentAttachment,
  uploadDiscussionImageAttachment,
} from '@/firebase/storage';
import { AppError } from '@/services/errorHandler';
import { notificationService } from '@/services/notificationService';
import { chatMuteService } from '@/services/chat/muteService';
import type { DiscussionRoom } from '@/types/InvestmentFlow';
import type { ChatAttachment, ChatMessage, ChatSenderRole } from '@/types/InvestmentChat';
import type { User } from '@/types/User';
import {
  attachmentKindFromMime,
  buildChatAttachmentFromUpload,
  type LocalChatAttachmentInput,
} from '@/utils/chatAttachments';
import { buildOutgoingMessageFields, describeChatUploadError, logChatUploadError, logChatUploadStep } from '@/utils/chatUpload';

import { normalizeChatMessage } from './chatMessageMapper';
import { assertSenderProfile, validateSendMessage } from './validateSendMessage';

export type SendChatMessageInput = {
  roomId: string;
  sender: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle'>;
  text: string;
  localAttachments?: LocalChatAttachmentInput[];
  attachments?: ChatAttachment[];
  replyTo?: string;
};

function now() {
  return new Date().toISOString();
}

function displayName(profile: Pick<User, 'displayName' | 'name' | 'username' | 'handle'> | null | undefined) {
  return profile?.displayName ?? profile?.name ?? profile?.username ?? profile?.handle ?? 'Ai PromptFund Member';
}

function omitUndefined<T extends object>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

function resolveSenderRole(room: DiscussionRoom, senderId: string): ChatSenderRole {
  if (senderId === room.founderId) return 'founder';
  if (senderId === room.investorId) return 'investor';
  return 'system';
}

async function uploadLocalAttachments({
  roomId,
  senderId,
  localAttachments,
}: {
  roomId: string;
  senderId: string;
  localAttachments: LocalChatAttachmentInput[];
}): Promise<ChatAttachment[]> {
  const uploaded: ChatAttachment[] = [];

  for (const local of localAttachments) {
    const kind = attachmentKindFromMime(local.mimeType, local.fileName);
    logChatUploadStep('F. Uploading attachment after safety checks', {
      roomId,
      fileName: local.fileName,
      mimeType: local.mimeType,
      kind,
    });

    try {
      const result = kind === 'image' || local.mimeType.startsWith('image/')
        ? await uploadDiscussionImageAttachment({
          roomId,
          userId: senderId,
          uri: local.uri,
          contentType: local.mimeType,
        })
        : await uploadDiscussionDocumentAttachment({
          roomId,
          userId: senderId,
          uri: local.uri,
          fileName: local.fileName,
          contentType: local.mimeType,
        });

      uploaded.push(buildChatAttachmentFromUpload({
        local,
        downloadUrl: result.downloadUrl,
      }));
    } catch (error) {
      logChatUploadError('F. Firebase Storage upload', error);
      throw new Error(describeChatUploadError('Firebase Storage upload', error));
    }
  }

  return uploaded;
}

async function writeChatMessage({
  room,
  sender,
  trimmedText,
  attachments,
  recipientId,
  replyTo,
}: {
  room: DiscussionRoom;
  sender: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle'>;
  trimmedText: string;
  attachments: ChatAttachment[];
  recipientId: string;
  replyTo?: string;
}): Promise<ChatMessage> {
  const createdAt = now();
  const senderRole = resolveSenderRole(room, sender.id);
  const messageFields = buildOutgoingMessageFields(trimmedText, attachments);
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

  logChatUploadStep('G. Creating Firestore message document', {
    roomId: room.id,
    type: messageFields.type,
    attachmentCount: attachments.length,
  });

  const messageReference = await addDoc(collection(getPromptFundFirestore(), firestoreCollections.discussionMessages), payload);

  await updateDoc(doc(getPromptFundFirestore(), firestoreCollections.discussionRooms, room.id), {
    lastMessage: trimmedText || attachments[0]?.name || 'Attachment',
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

  if (!chatMuteService.isConversationMuted(room, recipientId)) {
    notificationService.createNotification({
      userId: recipientId,
      title: 'New Investment Chat message',
      body: `${displayName(sender)}: ${(trimmedText || attachments[0]?.name || 'Sent an attachment').slice(0, 120)}`,
      type: 'message',
      data: { discussionRoomId: room.id },
    }).catch((error) => console.info('[PromptFund Chat] notification failed', error));
  }

  logChatUploadStep('G. Firestore message created', { messageId: messageReference.id });
  return normalizeChatMessage(messageReference.id, payload);
}

export const chatMessageService = {
  async sendMessage({
    roomId,
    sender,
    text,
    localAttachments = [],
    attachments = [],
    replyTo,
  }: SendChatMessageInput): Promise<ChatMessage> {
    assertSenderProfile(sender);

    logChatUploadStep('A-E. Running send safety checks', {
      roomId,
      senderId: sender.id,
      textLength: text.trim().length,
      localAttachmentCount: localAttachments.length,
      uploadedAttachmentCount: attachments.length,
    });

    const { trimmedText, recipientId, room } = await validateSendMessage({
      roomId,
      senderId: sender.id,
      text,
      localAttachments,
      attachments,
    });

    const uploadedAttachments = localAttachments.length > 0
      ? await uploadLocalAttachments({ roomId, senderId: sender.id, localAttachments })
      : [];

    const allAttachments = [...attachments, ...uploadedAttachments];

    return writeChatMessage({
      room,
      sender,
      trimmedText,
      attachments: allAttachments,
      recipientId,
      replyTo,
    });
  },

  async softDeleteMessage(message: ChatMessage, actorId: string, isAdmin = false): Promise<void> {
    if (!isAdmin && message.senderId !== actorId) {
      throw new AppError('You can only delete your own messages.', 'chat/forbidden-delete');
    }

    await updateDoc(doc(getPromptFundFirestore(), firestoreCollections.discussionMessages, message.id), {
      deleted: true,
      deletedAt: serverTimestamp(),
      text: '',
      body: '',
      updatedAt: serverTimestamp(),
    });
  },
};

export type { LocalChatAttachmentInput };
