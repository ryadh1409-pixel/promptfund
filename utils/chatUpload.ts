import type { ChatAttachment } from '@/types/InvestmentChat';

const LOG_PREFIX = '[PromptFund Chat Upload]';

export function logChatUploadStep(step: string, details?: Record<string, unknown>) {
  if (details) {
    console.log(`${LOG_PREFIX} ${step}`, details);
    return;
  }
  console.log(`${LOG_PREFIX} ${step}`);
}

export function logChatUploadError(step: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${LOG_PREFIX} ${step} failed`, { message, error });
}

export function describeChatUploadError(step: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return `${step} failed: ${message}`;
}

export function resolveOutgoingMessageType(text: string, attachments: ChatAttachment[]) {
  const primary = attachments[0];
  if (primary?.kind === 'image') return 'image' as const;
  if (primary) return 'file' as const;
  return 'text' as const;
}

export function buildOutgoingMessageFields(text: string, attachments: ChatAttachment[]) {
  const trimmed = text.trim();
  const type = resolveOutgoingMessageType(trimmed, attachments);
  const primary = attachments[0];

  if (type === 'image' && primary) {
    return {
      type,
      text: trimmed,
      attachmentUrl: primary.url,
      thumbnailUrl: primary.url,
      attachments,
    };
  }

  if (type === 'file' && primary) {
    return {
      type,
      text: trimmed || primary.name,
      attachmentUrl: primary.url,
      thumbnailUrl: primary.kind === 'image' ? primary.url : undefined,
      attachments,
    };
  }

  return {
    type,
    text: trimmed,
    attachments,
  };
}

export function resolveIncomingMessageType(
  data: Record<string, unknown>,
  attachments: ChatAttachment[],
): 'text' | 'image' | 'file' | 'system' {
  if (data.type === 'system') return 'system';
  if (data.type === 'image' || data.type === 'file' || data.type === 'text') {
    return data.type;
  }

  const attachmentUrl = typeof data.attachmentUrl === 'string' ? data.attachmentUrl : undefined;
  if (attachmentUrl) {
    const mimeType = attachments[0]?.mimeType ?? '';
    if (mimeType.startsWith('image/') || attachments[0]?.kind === 'image') {
      return 'image';
    }
    return 'file';
  }

  if (attachments.some((attachment) => attachment.kind === 'image')) {
    return 'image';
  }
  if (attachments.length > 0) {
    return 'file';
  }

  return 'text';
}
