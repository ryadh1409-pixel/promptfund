import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeaderBackButton } from '@/components/layout/ScreenHeader';
import { Card, LoadingState, PrimaryButton, Screen, ui } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { adminService } from '@/services/adminService';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { supportService } from '@/services/supportService';
import type { SupportTicket, SupportTicketMessage, SupportTicketStatus } from '@/types/User';

const supportStatuses: SupportTicketStatus[] = ['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed'];

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

export default function AdminSupportTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authUser, profile } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const ticketId = typeof id === 'string' ? id : '';

  useEffect(() => {
    if (!ticketId) return undefined;

    const unsubscribeTicket = supportService.subscribeTicket(ticketId, setTicket);
    const unsubscribeMessages = supportService.subscribeTicketMessages(ticketId, setMessages);
    return () => {
      unsubscribeTicket();
      unsubscribeMessages();
    };
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId || profile?.role !== 'admin') return;
    supportService.markTicketRead(ticketId, 'admin').catch(() => undefined);
  }, [messages.length, profile?.role, ticketId]);

  if (!authUser || profile?.role !== 'admin') {
    return <Redirect href="/login" />;
  }

  async function runAction(action: () => Promise<void>) {
    try {
      setIsWorking(true);
      setNotice(null);
      await action();
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsWorking(false);
    }
  }

  async function handleReply() {
    if (!reply.trim() || !authUser?.uid || !ticketId) return;
    await runAction(async () => {
      await adminService.replyToSupportTicket(ticketId, authUser.uid, reply.trim());
      setReply('');
    });
  }

  function confirmAction(message: string) {
    return new Promise<boolean>((resolve) => {
      Alert.alert('Confirm Admin Action', message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  }

  return (
    <Screen
      eyebrow="Admin Support"
      title={ticket ? `Ticket #${ticket.ticketNumber}` : 'Support Ticket'}
      subtitle="Manage support conversations, status, and resolution."
      leftAction={<ScreenHeaderBackButton />}
    >
      {!ticket ? <LoadingState label="Loading support ticket" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      {ticket ? (
        <>
          <Card style={styles.summaryCard}>
            <Text style={styles.subject}>{ticket.subject}</Text>
            <Text style={styles.meta}>User: {ticket.userName} · {ticket.userEmail}</Text>
            <Text style={styles.meta}>Category: {ticket.category}</Text>
            <Text style={styles.meta}>Status: {ticket.status}</Text>
            <Text style={styles.meta}>Created: {formatDate(ticket.createdAt)}</Text>
            <Text style={styles.meta}>Last updated: {formatDate(ticket.updatedAt)}</Text>
            <View style={ui.wrap}>
              <PrimaryButton label="View User Profile" variant="secondary" onPress={() => router.push(`/admin/user/${ticket.userId}`)} />
              {supportStatuses.map((status) => (
                <PrimaryButton
                  key={status}
                  label={status}
                  variant="secondary"
                  disabled={isWorking || ticket.status === status}
                  onPress={() => runAction(() => adminService.updateSupportTicketStatus(ticket.id, status))}
                />
              ))}
              <PrimaryButton
                label="Reopen Ticket"
                variant="secondary"
                disabled={isWorking}
                onPress={() => runAction(() => adminService.updateSupportTicketStatus(ticket.id, 'Open'))}
              />
              <PrimaryButton
                label="Delete Ticket"
                variant="secondary"
                disabled={isWorking}
                onPress={async () => {
                  const confirmed = await confirmAction('Delete this support ticket permanently?');
                  if (!confirmed) return;
                  await runAction(async () => {
                    await adminService.deleteSupportTicket(ticket.id);
                    router.back();
                  });
                }}
              />
            </View>
          </Card>

          <Card style={styles.threadCard}>
            <Text style={styles.sectionTitle}>Conversation History</Text>
            {messages.map((message) => (
              <View key={message.id} style={[styles.messageBubble, message.senderRole === 'admin' ? styles.messageAdmin : styles.messageUser]}>
                <Text style={styles.messageSender}>{message.senderRole === 'admin' ? 'PromptFund Support' : ticket.userName}</Text>
                <Text style={styles.messageBody}>{message.text}</Text>
                {message.attachments.length > 0 ? (
                  <View style={styles.attachmentList}>
                    {message.attachments.map((attachment) => (
                      <PrimaryButton
                        key={`${message.id}-${attachment.path}`}
                        label={`Open ${attachment.name}`}
                        variant="secondary"
                        onPress={() => Linking.openURL(attachment.downloadUrl)}
                      />
                    ))}
                  </View>
                ) : null}
                <Text style={styles.messageTime}>{formatDate(message.createdAt)}</Text>
              </View>
            ))}
          </Card>

          <Card style={styles.replyCard}>
            <TextInput
              value={reply}
              onChangeText={setReply}
              multiline
              placeholder="Write an admin reply..."
              placeholderTextColor={colors.subtle}
              style={styles.replyInput}
            />
            <PrimaryButton label={isWorking ? 'Sending...' : 'Send Reply'} onPress={handleReply} disabled={isWorking || !reply.trim()} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: spacing.sm,
  },
  subject: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    lineHeight: 22,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  threadCard: {
    gap: spacing.md,
  },
  messageBubble: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  messageAdmin: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(200, 162, 74, 0.14)',
    borderColor: 'rgba(200, 162, 74, 0.38)',
    maxWidth: '92%',
  },
  messageUser: {
    alignSelf: 'flex-start',
    backgroundColor: colors.black,
    borderColor: colors.border,
    maxWidth: '92%',
  },
  messageSender: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  messageBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  attachmentList: {
    gap: spacing.xs,
  },
  messageTime: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '700',
  },
  replyCard: {
    gap: spacing.md,
  },
  replyInput: {
    backgroundColor: colors.black,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 100,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  notice: {
    color: colors.danger,
    lineHeight: 22,
  },
});
