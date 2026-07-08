import type { ChatMessage } from '@/types/InvestmentChat';

export function shouldRenderMessage(message: ChatMessage): boolean {
  return !message.hiddenByModeration;
}
