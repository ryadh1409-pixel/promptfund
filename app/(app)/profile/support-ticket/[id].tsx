import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supportService } from '@/services/supportService';
import type { SupportTicket, SupportTicketMessage } from '@/types/User';

function formatDate(value: unknown) {
  if (typeof value === 'object' && value && 'toDate' in value) {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format((value as { toDate: () => Date }).toDate());
  }

  return 'Just now';
}

function errorMessage(error: unknown) {
  console.error('[PromptFund Support] conversation error', error);
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : null;
  const message = error instanceof Error ? error.message : String(error);

  if (code === 'permission-denied') {
    return `Firestore permission denied for this support conversation. Check supportTickets/{ticketId}/messages rules for the signed-in user. Firebase: ${message}`;
  }

  return code ? `${code}: ${message}` : message;
}

export default function SupportConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authUser, profile } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isAdmin = profile?.role === 'admin';
  const canReply = reply.trim().length > 0 && !isSending && !!authUser?.uid && !!id;

  useEffect(() => {
    if (!id) {
      return undefined;
    }

    const unsubscribeTicket = supportService.subscribeTicket(id, setTicket);
    const unsubscribeMessages = supportService.subscribeTicketMessages(id, setMessages);

    return () => {
      unsubscribeTicket();
      unsubscribeMessages();
    };
  }, [id]);

  useEffect(() => {
    if (!id || !authUser?.uid) {
      return;
    }

    supportService.markTicketRead(id, isAdmin ? 'admin' : 'user').catch((error) => {
      console.info('[PromptFund Support] mark read skipped', error);
    });
  }, [authUser?.uid, id, isAdmin, messages.length]);

  async function handleSendReply() {
    if (!canReply || !authUser?.uid || !id) {
      return;
    }

    try {
      setIsSending(true);
      setNotice(null);
      await supportService.addMessage({
        ticketId: id,
        senderId: authUser.uid,
        senderRole: isAdmin ? 'admin' : 'user',
        body: reply,
      });
      setReply('');
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Screen eyebrow="Support" title={ticket ? `Ticket #${ticket.ticketNumber}` : 'Support Conversation'} subtitle="Conversation with PromptFund Support.">
      {!ticket ? <LoadingState label="Loading support conversation" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}
      {ticket ? (
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={styles.statusBadge}>{ticket.status}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Created</Text>
            <Text style={styles.summaryValue}>{formatDate(ticket.createdAt)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Last updated</Text>
            <Text style={styles.summaryValue}>{formatDate(ticket.updatedAt)}</Text>
          </View>
          <Text style={styles.subject}>{ticket.subject}</Text>
        </Card>
      ) : null}

      <Card style={styles.threadCard}>
        <Text style={styles.sectionTitle}>Conversation</Text>
        {messages.map((message) => {
          const isMine = message.senderId === authUser?.uid;
          return (
            <View key={message.id} style={[styles.messageBubble, isMine ? styles.messageMine : styles.messageTheirs]}>
              <Text style={styles.messageSender}>{message.senderRole === 'admin' ? 'PromptFund Support' : 'You'}</Text>
              <Text style={styles.messageBody}>{message.text}</Text>
              {message.attachments.length > 0 ? <Text style={styles.attachmentText}>{message.attachments.length} attachment uploaded</Text> : null}
              <Text style={styles.messageTime}>{formatDate(message.createdAt)}</Text>
            </View>
          );
        })}
      </Card>

      <Card style={styles.replyCard}>
        <TextInput
          value={reply}
          onChangeText={setReply}
          multiline
          placeholder="Type your reply..."
          placeholderTextColor={colors.subtle}
          style={styles.replyInput}
        />
        <PrimaryButton label={isSending ? 'Sending...' : 'Send'} onPress={handleSendReply} disabled={!canReply} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: spacing.md,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.luxuryGold,
    fontSize: 14,
    fontWeight: '900',
  },
  statusBadge: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.42)',
    borderRadius: radii.pill,
    color: colors.luxuryGold,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  subject: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  threadCard: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  messageBubble: {
    maxWidth: '92%',
    borderWidth: 1,
    borderRadius: radii.lg,
    gap: spacing.xs,
    padding: spacing.md,
  },
  messageMine: {
    alignSelf: 'flex-end',
    borderColor: 'rgba(200, 162, 74, 0.38)',
    backgroundColor: 'rgba(200, 162, 74, 0.14)',
  },
  messageTheirs: {
    alignSelf: 'flex-start',
    borderColor: colors.border,
    backgroundColor: colors.black,
  },
  messageSender: {
    color: colors.luxuryGold,
    fontSize: 12,
    fontWeight: '900',
  },
  messageBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  attachmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  messageTime: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '800',
  },
  replyCard: {
    gap: spacing.md,
  },
  replyInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.black,
    color: colors.text,
    fontSize: 15,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  notice: {
    color: colors.danger,
    lineHeight: 22,
  },
});
