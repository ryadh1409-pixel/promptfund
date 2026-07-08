import type { ChatAttachment, ChatAttachmentKind } from '@/types/InvestmentChat';

export type LocalChatAttachmentInput = {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
};

export function attachmentKindFromMime(mimeType: string, fileName: string): ChatAttachmentKind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (fileName.toLowerCase().endsWith('.m4a') || mimeType.startsWith('audio/')) return 'voice';
  return 'document';
}

export function buildChatAttachmentFromUpload({
  local,
  downloadUrl,
}: {
  local: LocalChatAttachmentInput;
  downloadUrl: string;
}): ChatAttachment {
  return {
    id: `attachment-${Date.now()}-${local.fileName}`,
    name: local.fileName,
    url: downloadUrl,
    mimeType: local.mimeType,
    sizeBytes: local.sizeBytes,
    kind: attachmentKindFromMime(local.mimeType, local.fileName),
  };
}
