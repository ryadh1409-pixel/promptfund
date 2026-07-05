export type ChatSenderRole = 'founder' | 'investor' | 'admin' | 'system';

export type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export type ChatAttachmentKind = 'image' | 'document' | 'video' | 'voice';

export type ChatAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes?: number;
  kind: ChatAttachmentKind;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  discussionRoomId: string;
  senderId: string;
  senderRole: ChatSenderRole;
  senderName: string;
  text: string;
  attachments?: ChatAttachment[];
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  deliveredAt?: string;
  readAt?: string;
  status: ChatMessageStatus;
  replyTo?: string;
  reactions?: Record<string, string[]>;
  isPinned?: boolean;
  type?: 'user' | 'system';
  /** @deprecated legacy single image */
  imageUrl?: string;
  /** @deprecated legacy single document */
  documentUrl?: string;
  documentName?: string;
  linkUrl?: string;
  body?: string;
};

export type ChatPresence = {
  isOnline?: boolean;
  lastSeenAt?: string;
};

export const chatReactionOptions = ['👍', '❤️', '👏', '🔥', '🎉'] as const;

export type ChatReaction = (typeof chatReactionOptions)[number];
