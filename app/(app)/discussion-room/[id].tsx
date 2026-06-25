import { router, useLocalSearchParams } from 'expo-router';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, FieldPreview, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import { userService } from '@/services/userService';
import type { DiscussionMessage, DiscussionRoom } from '@/types/InvestmentFlow';

export default function DiscussionRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authUser, profile } = useAuth();
  const [room, setRoom] = useState<DiscussionRoom | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [message, setMessage] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [imageAttachmentUrl, setImageAttachmentUrl] = useState('');
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const messageScrollRef = useRef<ScrollView | null>(null);

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
    if (!room || !authUser || messages.length === 0) {
      return;
    }

    investmentFlowService.markDiscussionRead(room, authUser.uid).catch((error) => {
      console.info('[PromptFund Discussion] read receipt update failed', error);
    });
  }, [authUser, messages.length, room]);

  useEffect(() => {
    if (!room || !authUser) {
      return;
    }

    const isTyping = message.trim().length > 0;
    investmentFlowService.setTyping(room, authUser.uid, isTyping).catch((error) => {
      console.info('[PromptFund Discussion] typing update failed', error);
    });

    if (!isTyping) {
      return;
    }

    const timeout = setTimeout(() => {
      investmentFlowService.setTyping(room, authUser.uid, false).catch((error) => {
        console.info('[PromptFund Discussion] typing clear failed', error);
      });
    }, 1600);

    return () => clearTimeout(timeout);
  }, [authUser, message, room]);

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
      setModerationWarning(null);
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
        {
          imageUrl: imageAttachmentUrl.trim() || undefined,
        },
      );
      setMessage('');
      setImageAttachmentUrl('');
    } catch (messageError) {
      const friendlyMessage = getFriendlyErrorMessage(messageError);
      if (friendlyMessage.includes('Community Guidelines')) {
        setModerationWarning(friendlyMessage);
        return;
      }
      setNotice(friendlyMessage);
    }
  }

  const visibleMessages = messages.filter((item) => {
    const search = messageSearch.trim().toLowerCase();
    if (!search) {
      return true;
    }
    return `${item.senderName} ${item.body}`.toLowerCase().includes(search);
  });

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

  async function handleMuteConversation() {
    if (!room || !authUser) return;

    try {
      await investmentFlowService.updateConversationSafety(room, authUser.uid, 'mutedBy');
      setNotice('Conversation muted.');
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    }
  }

  async function handleLeaveConversation() {
    if (!room || !authUser) return;

    try {
      await investmentFlowService.updateConversationSafety(room, authUser.uid, 'leftBy');
      setNotice('Conversation removed from your active view.');
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    }
  }

  async function handleReportConversation() {
    if (!room || !authUser) return;

    const reportedUid = authUser.uid === room.founderId ? room.investorId : room.founderId;
    try {
      await userService.reportUser({
        reporterUid: authUser.uid,
        reportedUid,
        reason: 'Other',
        details: `Conversation reported from discussion room ${room.id}.`,
        discussionRoomId: room.id,
        startupId: room.opportunityId,
      });
      setNotice('Conversation reported for admin review.');
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    }
  }

  async function handleBlockCounterparty() {
    if (!room || !authUser) return;

    const blockedUid = authUser.uid === room.founderId ? room.investorId : room.founderId;
    try {
      await userService.blockUser(authUser.uid, blockedUid);
      setNotice('User blocked.');
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
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
            <View style={styles.chatHeader}>
              <Text style={styles.sectionTitle}>Discussion</Text>
              {authUser && (room.unreadCounts?.[authUser.uid] ?? 0) > 0 ? (
                <Text style={styles.unreadBadge}>{room.unreadCounts?.[authUser.uid]} unread</Text>
              ) : null}
            </View>
            {messages.length === 0 ? (
              <Text style={styles.empty}>No discussion messages yet. Start with the investment purpose and next milestone.</Text>
            ) : null}
            <TextInput
              placeholder="Search messages"
              placeholderTextColor={colors.subtle}
              value={messageSearch}
              onChangeText={setMessageSearch}
              style={styles.searchInput}
            />
            <ScrollView
              ref={messageScrollRef}
              style={styles.messageList}
              onContentSizeChange={() => messageScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {visibleMessages.map((item, index) => {
                const previous = visibleMessages[index - 1];
                const showDateSeparator = getMessageDateLabel(previous?.createdAt) !== getMessageDateLabel(item.createdAt);

                return (
                  <View key={item.id}>
                    {showDateSeparator ? <Text style={styles.dateSeparator}>{getMessageDateLabel(item.createdAt)}</Text> : null}
                    <View style={[
                      styles.messageBubble,
                      item.type === 'system' ? styles.systemMessageBubble : null,
                      authUser?.uid === item.senderId ? styles.ownMessageBubble : null,
                    ]}>
                      <Text style={styles.messageAuthor}>{item.type === 'system' ? 'PromptFund System' : item.senderName}</Text>
                      <Text style={styles.messageBody}>{item.body}</Text>
                      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.messageImage} /> : null}
                      <View style={styles.messageMetaRow}>
                        <Text style={styles.messageMeta}>{formatMessageTime(item.createdAt)}</Text>
                        {authUser?.uid === item.senderId && room ? (
                          <Text style={styles.messageMeta}>{getDeliveryStatus(item, room, authUser.uid)}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            {room && authUser && isCounterpartyTyping(room, authUser.uid) ? (
              <Text style={styles.typingText}>The other party is typing...</Text>
            ) : null}
            {moderationWarning ? <Text style={styles.moderationWarning}>{moderationWarning}</Text> : null}
            <TextInput
              multiline
              placeholder="Write a professional discussion note..."
              placeholderTextColor={colors.subtle}
              value={message}
              onChangeText={(value) => {
                setModerationWarning(null);
                setMessage(value);
              }}
              style={styles.input}
            />
            <TextInput
              placeholder="Optional image attachment URL"
              placeholderTextColor={colors.subtle}
              value={imageAttachmentUrl}
              onChangeText={setImageAttachmentUrl}
              autoCapitalize="none"
              style={styles.searchInput}
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

          <Card>
            <Text style={styles.sectionTitle}>Community Safety</Text>
            <Text style={styles.empty}>Manage this discussion if anything feels unsafe or off-platform.</Text>
            <View style={styles.actions}>
              <PrimaryButton label="Mute Conversation" variant="secondary" onPress={handleMuteConversation} />
              <PrimaryButton label="Leave Discussion" variant="secondary" onPress={handleLeaveConversation} />
              <PrimaryButton label="Delete Conversation" variant="secondary" onPress={handleLeaveConversation} />
              <PrimaryButton label="Report Conversation" variant="secondary" onPress={handleReportConversation} />
              <PrimaryButton label="Block User" variant="secondary" onPress={handleBlockCounterparty} />
            </View>
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

function formatMessageTime(value: unknown) {
  try {
    const date = typeof value === 'object' && value !== null && 'toDate' in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(String(value));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'Now';
  }
}

function getMessageDateLabel(value: unknown) {
  if (!value) {
    return '';
  }

  try {
    const date = typeof value === 'object' && value !== null && 'toDate' in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(String(value));
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

function isCounterpartyTyping(room: DiscussionRoom, currentUid: string) {
  return Object.entries(room.typingBy ?? {}).some(([uid, isTyping]) => uid !== currentUid && isTyping);
}

function getDeliveryStatus(message: DiscussionMessage, room: DiscussionRoom, currentUid: string) {
  const otherUid = currentUid === room.founderId ? room.investorId : room.founderId;
  const otherReadAt = room.readReceipts?.[otherUid];
  if (otherReadAt && String(otherReadAt) >= String(message.createdAt)) {
    return 'Read';
  }

  return message.deliveredTo?.includes(otherUid) ? 'Delivered' : 'Sent';
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
  chatHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  unreadBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(177, 18, 38, 0.22)',
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  empty: {
    color: colors.muted,
    lineHeight: 22,
  },
  messageList: {
    maxHeight: 340,
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.24)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.black,
  },
  dateSeparator: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(216, 201, 163, 0.12)',
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  messageBubble: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.black,
    marginBottom: spacing.sm,
  },
  ownMessageBubble: {
    borderColor: 'rgba(200, 162, 74, 0.42)',
    backgroundColor: 'rgba(200, 162, 74, 0.08)',
  },
  systemMessageBubble: {
    borderColor: 'rgba(64, 156, 255, 0.32)',
    backgroundColor: 'rgba(64, 156, 255, 0.08)',
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
  messageMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  messageMeta: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '800',
  },
  messageImage: {
    width: '100%',
    height: 180,
    borderRadius: radii.md,
    backgroundColor: colors.panelMuted,
  },
  typingText: {
    color: colors.luxuryGold,
    fontSize: 13,
    fontWeight: '800',
  },
  moderationWarning: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
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
