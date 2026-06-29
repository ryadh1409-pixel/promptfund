import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, LoadingState, PrimaryLink, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supportService } from '@/services/supportService';
import type { SupportTicket } from '@/types/User';

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

export default function SupportTicketsScreen() {
  const { authUser } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.uid) {
      setIsLoading(false);
      return undefined;
    }

    return supportService.subscribeUserTickets(authUser.uid, (nextTickets) => {
      setTickets(nextTickets);
      setIsLoading(false);
    });
  }, [authUser?.uid]);

  return (
    <Screen eyebrow="Support" title="My Support Tickets" subtitle="Track support conversations with the PromptFund team.">
      <PrimaryLink href="/profile/contact-support" label="New Support Ticket" />
      {isLoading ? <LoadingState label="Loading support tickets" /> : null}
      {!isLoading && tickets.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No tickets yet</Text>
          <Text style={styles.copy}>When you contact PromptFund Support, your conversations will appear here.</Text>
        </Card>
      ) : null}
      {tickets.map((ticket) => (
        <Link key={ticket.id} href={`/profile/support-ticket/${ticket.id}`} asChild>
          <Pressable accessibilityRole="button" style={styles.ticketCard}>
            <View style={styles.ticketText}>
              <Text style={styles.ticketNumber}>Ticket #{ticket.ticketNumber}</Text>
              <Text style={styles.subject}>{ticket.subject}</Text>
              <Text style={styles.meta}>Last Updated {formatDate(ticket.updatedAt)}</Text>
            </View>
            <View style={styles.statusBlock}>
              {ticket.unreadByUser ? <Text style={styles.unreadBadge}>New</Text> : null}
              <Text style={styles.status}>{ticket.status}</Text>
            </View>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ticketCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.16)',
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.panel,
    padding: spacing.lg,
  },
  ticketText: {
    flex: 1,
    gap: spacing.xs,
  },
  ticketNumber: {
    color: colors.luxuryGold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subject: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  statusBlock: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  status: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  unreadBadge: {
    overflow: 'hidden',
    minWidth: 24,
    borderRadius: 12,
    backgroundColor: colors.pokerRed,
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  copy: {
    color: colors.muted,
    lineHeight: 22,
  },
});
