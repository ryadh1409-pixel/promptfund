import type { ChatMessage, ChatMessageStatus } from '@/types/InvestmentChat';

export function formatMessageTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function getMessageDateLabel(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
}

export function getMessageStatusLabel(message: ChatMessage, currentUserId: string) {
  if (message.senderId !== currentUserId) return '';
  const status: ChatMessageStatus = message.status ?? 'sent';
  if (status === 'sending') return '○ Sending';
  if (status === 'sent') return '✓ Sent';
  if (status === 'delivered') return '✓ Delivered';
  if (status === 'read') return '✓✓ Read';
  return '✓ Sent';
}

export function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


export function getCounterpartyTypingLabel(
  room: { typingBy?: Record<string, boolean>; founderId: string; investorId: string; founderName: string; investorName: string },
  currentUserId: string,
) {
  const typingUserId = Object.entries(room.typingBy ?? {}).find(([uid, isTyping]) => uid !== currentUserId && isTyping)?.[0];
  if (!typingUserId) return null;
  if (typingUserId === room.founderId) return `${room.founderName} is typing...`;
  if (typingUserId === room.investorId) return `${room.investorName} is typing...`;
  return 'Typing...';
}

export type ChatListItem =
  | { type: 'date'; id: string; label: string }
  | { type: 'message'; id: string; message: ChatMessage };

export function buildChatListItems(messages: ChatMessage[]): ChatListItem[] {
  const items: ChatListItem[] = [];
  let previousDate = '';

  messages.forEach((message) => {
    const dateLabel = getMessageDateLabel(message.createdAt);
    if (dateLabel && dateLabel !== previousDate) {
      items.push({ type: 'date', id: `date-${dateLabel}-${message.id}`, label: dateLabel });
      previousDate = dateLabel;
    }
    items.push({ type: 'message', id: message.id, message });
  });

  return items;
}
