import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { investmentChatService } from '@/services/investmentChatService';
import type { DiscussionRoom } from '@/types/InvestmentFlow';
import type { ChatMessage } from '@/types/InvestmentChat';

type AdminInvestmentChatsProps = {
  rooms: DiscussionRoom[];
  messages: ChatMessage[];
  onDeleteMessage: (messageId: string) => Promise<void>;
};

export function AdminInvestmentChats({ rooms, messages, onDeleteMessage }: AdminInvestmentChatsProps) {
  const [search, setSearch] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    const queryText = search.trim().toLowerCase();
    if (!queryText) return rooms;
    return rooms.filter((room) => [
      room.startupName,
      room.founderName,
      room.investorName,
      room.id,
    ].join(' ').toLowerCase().includes(queryText));
  }, [rooms, search]);

  const roomMessages = useMemo(() => {
    if (!selectedRoomId) return [];
    const roomItems = messages.filter((message) => message.discussionRoomId === selectedRoomId || message.roomId === selectedRoomId);
    return investmentChatService.searchMessages(roomItems, search);
  }, [messages, search, selectedRoomId]);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;

  return (
    <Card>
      <Text style={styles.title}>Investment Chats</Text>
      <Text style={styles.subtitle}>Review founder and investor conversations for compliance and dispute resolution.</Text>
      <TextInput
        placeholder="Search by founder, investor, project..."
        placeholderTextColor={colors.subtle}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      <View style={styles.roomList}>
        {filteredRooms.slice(0, 12).map((room) => (
          <Pressable
            key={room.id}
            onPress={() => setSelectedRoomId(room.id)}
            style={[styles.roomCard, selectedRoomId === room.id ? styles.roomCardActive : null]}
          >
            <Text style={styles.roomName}>{room.startupName}</Text>
            <Text style={styles.roomMeta}>{room.founderName} ↔ {room.investorName}</Text>
            <Text style={styles.roomMeta}>Unread founder: {room.unreadCounts?.[room.founderId] ?? 0} · investor: {room.unreadCounts?.[room.investorId] ?? 0}</Text>
          </Pressable>
        ))}
      </View>
      {selectedRoom ? (
        <View style={styles.thread}>
          <View style={styles.threadHeader}>
            <Text style={styles.threadTitle}>{selectedRoom.startupName}</Text>
            <PrimaryButton label="Open Chat" variant="secondary" onPress={() => router.push(`/discussion-room/${selectedRoom.id}`)} />
          </View>
          {roomMessages.slice(-30).map((message) => (
            <View key={message.id} style={styles.messageRow}>
              <View style={styles.messageCopy}>
                <Text style={styles.messageAuthor}>{message.senderName}</Text>
                <Text style={styles.messageBody}>{message.deletedAt ? '[deleted]' : (message.text || message.attachments?.[0]?.name || 'Attachment')}</Text>
                <Text style={styles.messageMeta}>
                  {message.createdAt} · {message.status ?? 'sent'}
                  {message.readAt ? ` · read ${message.readAt}` : ''}
                </Text>
              </View>
              <PrimaryButton
                label="Delete"
                variant="secondary"
                onPress={() => onDeleteMessage(message.id)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  search: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  roomList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  roomCard: {
    backgroundColor: colors.panelMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  roomCardActive: {
    borderColor: colors.accent,
  },
  roomName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  roomMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  thread: {
    gap: spacing.sm,
  },
  threadHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  threadTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  messageRow: {
    alignItems: 'flex-start',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  messageCopy: {
    flex: 1,
    gap: 2,
  },
  messageAuthor: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  messageBody: {
    color: colors.text,
    fontSize: 14,
  },
  messageMeta: {
    color: colors.subtle,
    fontSize: 11,
  },
});
