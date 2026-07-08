import type { ChatAttachment, ChatMessage, ChatSenderRole } from '@/types/InvestmentChat';
import { resolveIncomingMessageType } from '@/utils/chatUpload';

function now() {
  return new Date().toISOString();
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
    deleted: data.deleted === true || typeof data.deletedAt === 'string',
    deletedAt: typeof data.deletedAt === 'string' ? data.deletedAt : undefined,
    hiddenByModeration: data.hiddenByModeration === true,
    reportedCount: typeof data.reportedCount === 'number' ? data.reportedCount : undefined,
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
