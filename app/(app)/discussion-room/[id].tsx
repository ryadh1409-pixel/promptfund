import { router, useLocalSearchParams } from 'expo-router';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, FieldPreview, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import type { DiscussionMessage, DiscussionRoom } from '@/types/InvestmentFlow';

export default function DiscussionRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authUser, profile } = useAuth();
  const [room, setRoom] = useState<DiscussionRoom | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const participantRole = useMemo(() => {
    if (!authUser || !room) {
      return null;
    }
    if (authUser.uid === room.founderId) {
      return 'founder';
    }
    if (authUser.uid === room.investorId) {
      return 'investor';
    }
    return null;
  }, [authUser, room]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const path = `${firestoreCollections.discussionRooms}/${id}`;
    console.info('[PromptFund Firestore] read start', { path, operation: 'onSnapshot' });
    const unsubscribe = onSnapshot(
      doc(getPromptFundFirestore(), firestoreCollections.discussionRooms, id),
      (snapshot) => {
        console.info('[PromptFund Firestore] read success', {
          path,
          operation: 'onSnapshot',
          exists: snapshot.exists(),
        });
        setRoom(snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as DiscussionRoom) : null);
        setIsLoading(false);
      },
      (error) => {
        console.error('[PromptFund Firestore] read failure', { path, operation: 'onSnapshot', error });
        setNotice(getFriendlyErrorMessage(error));
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const path = `${firestoreCollections.discussionMessages}/*?discussionRoomId==${id}`;
    const messagesQuery = query(
      collection(getPromptFundFirestore(), firestoreCollections.discussionMessages),
      where('discussionRoomId', '==', id),
    );

    console.info('[PromptFund Firestore] read start', { path, operation: 'onSnapshot' });
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        console.info('[PromptFund Firestore] read success', {
          path,
          operation: 'onSnapshot',
          count: snapshot.docs.length,
        });
        const nextMessages = snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as DiscussionMessage)
          .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
        setMessages(nextMessages);
      },
      (error) => {
        console.error('[PromptFund Firestore] read failure', { path, operation: 'onSnapshot', error });
        setNotice(getFriendlyErrorMessage(error));
      },
    );

    return unsubscribe;
  }, [id]);

  async function handleSendMessage() {
    if (!room || !profile || !message.trim()) {
      return;
    }

    try {
      await investmentFlowService.addDiscussionMessage(
        room,
        {
          id: profile.id,
          displayName: profile.displayName,
          name: profile.name,
          username: profile.username,
          handle: profile.handle,
        },
        message.trim(),
      );
      setMessage('');
    } catch (messageError) {
      setNotice(getFriendlyErrorMessage(messageError));
    }
  }

  async function handleReady(role: 'founder' | 'investor') {
    if (!room) {
      return;
    }

    try {
      await investmentFlowService.setReady(room, role);
    } catch (readyError) {
      setNotice(getFriendlyErrorMessage(readyError));
    }
  }

  async function handleContinueAgreement() {
    if (!room) {
      return;
    }

    try {
      const agreement = room.agreementId
        ? await investmentFlowService.getAgreement(room.agreementId)
        : await investmentFlowService.generateAgreement(room);

      if (!agreement) {
        throw new Error('Unable to load Investment Agreement.');
      }

      router.push(`/agreement/${agreement.id}`);
    } catch (agreementError) {
      setNotice(getFriendlyErrorMessage(agreementError));
    }
  }

  return (
    <Screen
      eyebrow="Investment Discussion Room"
      title="Investment Discussion Room"
      subtitle="Founder and Angel Investor align on the opportunity before agreement generation."
    >
      {isLoading ? <LoadingState label="Loading Investment Discussion Room" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      {!isLoading && !room ? (
        <Card>
          <Text style={styles.notice}>Investment Discussion Room not found.</Text>
        </Card>
      ) : null}

      {room ? (
        <>
          <Card>
            <Text style={styles.roomTitle}>{room.startupName}</Text>
            <View style={styles.grid}>
              <FieldPreview label="Founder Profile" value={room.founderName} />
              <FieldPreview label="Angel Investor Profile" value={room.investorName} />
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Discussion</Text>
            {messages.length === 0 ? (
              <Text style={styles.empty}>No discussion messages yet. Start with the investment purpose and next milestone.</Text>
            ) : null}
            {messages.map((item) => (
              <View key={item.id} style={styles.messageBubble}>
                <Text style={styles.messageAuthor}>{item.senderName}</Text>
                <Text style={styles.messageBody}>{item.body}</Text>
              </View>
            ))}
            <TextInput
              multiline
              placeholder="Write a professional discussion note..."
              placeholderTextColor={colors.subtle}
              value={message}
              onChangeText={setMessage}
              style={styles.input}
            />
            <PrimaryButton label="Send Message" onPress={handleSendMessage} disabled={!message.trim()} />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Readiness</Text>
            <View style={styles.readyRow}>
              <ReadyBadge label="Founder Ready" ready={room.founderReady} />
              <ReadyBadge label="Investor Ready" ready={room.investorReady} />
            </View>
            <View style={styles.actions}>
              <PrimaryButton
                label="Founder Ready"
                variant="secondary"
                onPress={() => handleReady('founder')}
                disabled={participantRole !== 'founder' || room.founderReady}
              />
              <PrimaryButton
                label="Investor Ready"
                variant="secondary"
                onPress={() => handleReady('investor')}
                disabled={participantRole !== 'investor' || room.investorReady}
              />
            </View>
            {(room.founderReady || room.investorReady) && room.status !== 'ready' ? (
              <Text style={styles.waitingCopy}>Waiting for the other party.</Text>
            ) : null}
            {room.status === 'ready' ? (
              <View style={styles.readyPanel}>
                <Text style={styles.readyCopy}>Both parties are ready.</Text>
                <PrimaryButton label="Continue To Agreement" onPress={handleContinueAgreement} />
              </View>
            ) : null}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function ReadyBadge({ label, ready }: { label: string; ready: boolean }) {
  return (
    <View style={[styles.readyBadge, ready ? styles.readyBadgeActive : null]}>
      <Text style={styles.readyLabel}>{label}</Text>
      <Text style={styles.readyValue}>{ready ? 'Ready' : 'Pending'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    color: colors.text,
    lineHeight: 22,
  },
  roomTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  grid: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  empty: {
    color: colors.muted,
    lineHeight: 22,
  },
  messageBubble: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.black,
  },
  messageAuthor: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  messageBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.black,
    textAlignVertical: 'top',
  },
  readyRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  readyBadge: {
    flex: 1,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.26)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.black,
  },
  readyBadgeActive: {
    borderColor: colors.success,
  },
  readyLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  readyValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  actions: {
    gap: spacing.sm,
  },
  readyPanel: {
    gap: spacing.md,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: 'rgba(46, 125, 50, 0.16)',
  },
  readyCopy: {
    color: colors.text,
    fontWeight: '800',
    textAlign: 'center',
  },
  waitingCopy: {
    color: colors.warning,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
