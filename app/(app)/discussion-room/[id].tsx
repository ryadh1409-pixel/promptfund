import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BlockUserControl } from '@/components/safety/BlockUserControl';
import { TestFlightCard } from '@/components/testflight/TestFlightCard';
import { Card, FieldPreview, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { uploadDiscussionDocumentAttachment, uploadDiscussionImageAttachment } from '@/firebase/storage';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import { userService } from '@/services/userService';
import type { BlockStatus } from '@/services/userService';
import type { DiscussionMessage, DiscussionRoom } from '@/types/InvestmentFlow';
import type { DiscussionReportReason, User } from '@/types/User';

const supportedDocumentTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const reportReasons: DiscussionReportReason[] = [
  'Spam',
  'Scam or Fraud',
  'Bad language',
  'False Investment Information',
  'Other',
];

type PendingImageAttachment = {
  localUri: string;
  downloadUrl: string;
};

type PendingDocumentAttachment = {
  name: string;
  downloadUrl: string;
};

export default function DiscussionRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authUser, profile } = useAuth();
  const [room, setRoom] = useState<DiscussionRoom | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [message, setMessage] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [pendingImage, setPendingImage] = useState<PendingImageAttachment | null>(null);
  const [pendingDocument, setPendingDocument] = useState<PendingDocumentAttachment | null>(null);
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSavingTestFlight, setIsSavingTestFlight] = useState(false);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [counterpartyProfile, setCounterpartyProfile] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState<DiscussionReportReason>('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const messageScrollRef = useRef<ScrollView | null>(null);
  const lastTypingStateRef = useRef<boolean | null>(null);
  const roomId = typeof id === 'string' ? id : '';

  const participantRole = useMemo(() => {
    if (!authUser?.uid || !room) {
      return null;
    }
    if (authUser.uid === room.founderId) {
      return 'founder';
    }
    if (authUser.uid === room.investorId) {
      return 'investor';
    }
    return null;
  }, [authUser?.uid, room?.founderId, room?.investorId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const path = `${firestoreCollections.discussionRooms}/${roomId}`;
    const unsubscribe = onSnapshot(
      doc(getPromptFundFirestore(), firestoreCollections.discussionRooms, roomId),
      (snapshot) => {
        const nextRoom = snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as DiscussionRoom) : null;
        const nextMessages = sortMessages(nextRoom?.messages ?? []);
        setRoom((currentRoom) => areDiscussionRoomsEqual(currentRoom, nextRoom) ? currentRoom : nextRoom);
        setMessages((currentMessages) => areDiscussionMessagesEqual(currentMessages, nextMessages) ? currentMessages : nextMessages);
        setIsLoading((current) => current ? false : current);
      },
      (error) => {
        console.error('[PromptFund Firestore] read failure', { path, operation: 'onSnapshot', error });
        setNotice(getFriendlyErrorMessage(error));
        setIsLoading((current) => current ? false : current);
      },
    );

    return unsubscribe;
  }, [roomId]);

  useEffect(() => {
    lastTypingStateRef.current = null;
  }, [roomId]);

  const unreadCount = authUser?.uid && room ? (room.unreadCounts?.[authUser.uid] ?? 0) : 0;
  const counterpartyId = authUser?.uid && room
    ? authUser.uid === room.founderId
      ? room.investorId
      : room.founderId
    : null;
  const counterpartyName = authUser?.uid && room
    ? authUser.uid === room.founderId
      ? room.investorName
      : room.founderName
    : 'this user';
  const canUseComposer = Boolean(blockStatus && !blockStatus.blockedByMe && !blockStatus.blockedMe);
  const hasPendingAttachment = Boolean(pendingImage || pendingDocument);
  const canSendMessage = canUseComposer && !isUploadingAttachment && (message.trim().length > 0 || hasPendingAttachment);

  useEffect(() => {
    if (!counterpartyId) {
      setCounterpartyProfile(null);
      return;
    }

    let isMounted = true;
    userService.getUserById(counterpartyId)
      .then((user) => {
        if (isMounted) {
          setCounterpartyProfile(user);
        }
      })
      .catch((error) => setNotice(getFriendlyErrorMessage(error)));

    return () => {
      isMounted = false;
    };
  }, [counterpartyId]);

  useEffect(() => {
    if (!room || !authUser?.uid || messages.length === 0) {
      return;
    }

    const hasUnreadInboundMessages = messages.some((item) => item.senderId !== authUser.uid && !item.readBy?.includes(authUser.uid));
    if (!hasUnreadInboundMessages && unreadCount === 0) {
      return;
    }

    investmentFlowService.markDiscussionRead(room, authUser.uid).catch((error) => {
      console.info('[PromptFund Discussion] read receipt update failed', error);
    });
  }, [authUser?.uid, messages, room, unreadCount]);

  useEffect(() => {
    if (!room || !authUser?.uid) {
      return;
    }

    const isTyping = message.trim().length > 0;
    if (lastTypingStateRef.current === isTyping) {
      return;
    }

    lastTypingStateRef.current = isTyping;
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
      lastTypingStateRef.current = false;
    }, 1600);

    return () => clearTimeout(timeout);
  }, [authUser?.uid, message, room?.id]);

  const handleAttachPhoto = useCallback(async () => {
    if (!room || !authUser?.uid) {
      setNotice('Open an Investment Chat before attaching a photo.');
      return;
    }

    try {
      setNotice(null);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice('Photo library permission is required to attach a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.82,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setIsUploadingAttachment(true);
      const upload = await uploadDiscussionImageAttachment({
        roomId: room.id,
        userId: authUser.uid,
        uri: asset.uri,
        contentType: asset.mimeType ?? 'image/jpeg',
      });

      setPendingImage({
        localUri: asset.uri,
        downloadUrl: upload.downloadUrl,
      });
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsUploadingAttachment(false);
    }
  }, [authUser?.uid, room?.id]);

  const handleAttachDocument = useCallback(async () => {
    if (!room || !authUser?.uid) {
      setNotice('Open an Investment Chat before attaching a document.');
      return;
    }

    try {
      setNotice(null);
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: supportedDocumentTypes,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const contentType = asset.mimeType ?? mimeTypeFromFileName(asset.name);
      if (!isSupportedDocumentType(contentType, asset.name)) {
        setNotice('Attach a PDF, DOC, DOCX, or TXT document.');
        return;
      }

      setIsUploadingAttachment(true);
      const upload = await uploadDiscussionDocumentAttachment({
        roomId: room.id,
        userId: authUser.uid,
        uri: asset.uri,
        fileName: asset.name,
        contentType,
      });

      setPendingDocument({
        name: asset.name,
        downloadUrl: upload.downloadUrl,
      });
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsUploadingAttachment(false);
    }
  }, [authUser?.uid, room?.id]);

  const handleSendMessage = useCallback(async () => {
    if (!room || !profile || !canSendMessage || !blockStatus || blockStatus.blockedByMe || blockStatus.blockedMe) {
      return;
    }

    try {
      setModerationWarning(null);
      const body = message.trim() || (pendingDocument ? `Attached ${pendingDocument.name}` : 'Attached photo');
      await investmentFlowService.addDiscussionMessage(
        room,
        {
          id: profile.id,
          displayName: profile.displayName,
          name: profile.name,
          username: profile.username,
          handle: profile.handle,
        },
        body,
        {
          imageUrl: pendingImage?.downloadUrl,
          documentUrl: pendingDocument?.downloadUrl,
          documentName: pendingDocument?.name,
          blockStatus: blockStatus ?? undefined,
        },
      );
      setMessage('');
      setPendingImage(null);
      setPendingDocument(null);
    } catch (messageError) {
      const friendlyMessage = getFriendlyErrorMessage(messageError);
      if (friendlyMessage.includes('Community Guidelines')) {
        setModerationWarning(friendlyMessage);
        return;
      }
      setNotice(friendlyMessage);
    }
  }, [blockStatus, canSendMessage, message, pendingDocument, pendingImage, profile, room]);

  const handleOpenDocument = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    }
  }, []);

  const visibleMessages = useMemo(() => messages.filter((item) => {
    const search = messageSearch.trim().toLowerCase();
    if (!search) {
      return true;
    }
    return `${item.senderName} ${item.body}`.toLowerCase().includes(search);
  }), [messageSearch, messages]);

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
      if (room.agreementId) {
        router.push(`/agreement/${room.agreementId}`);
        return;
      }

      const agreement = await investmentFlowService.generateAgreement(room);

      if (!agreement) {
        throw new Error('Unable to load Investment Agreement.');
      }

      router.push(`/agreement/${agreement.id}`);
    } catch (agreementError) {
      setNotice(getFriendlyErrorMessage(agreementError));
    }
  }

  async function handleToggleTestFlight(nextReady: boolean) {
    if (!room || !participantRole) {
      return;
    }

    const previousRoom = room;
    const field = participantRole === 'founder' ? 'founderTestFlightReady' : 'investorTestFlightReady';

    try {
      setRoom((currentRoom) => currentRoom ? { ...currentRoom, [field]: nextReady } : currentRoom);
      setIsSavingTestFlight(true);
      await investmentFlowService.setTestFlightReady(room, participantRole, nextReady);
    } catch (error) {
      setRoom(previousRoom);
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsSavingTestFlight(false);
    }
  }

  function handleReportConversation() {
    setReportReason('Spam');
    setReportDetails('');
    setIsReportModalVisible(true);
  }

  async function handleSubmitReport() {
    if (!room || !authUser?.uid || !counterpartyId || isSubmittingReport) return;
    if (reportReason === 'Other' && !reportDetails.trim()) {
      setNotice('Describe what happened before submitting the report.');
      return;
    }

    try {
      setIsSubmittingReport(true);
      const result = await userService.submitDiscussionReport({
        reporterUid: authUser.uid,
        reportedUid: counterpartyId,
        discussionRoomId: room.id,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      setIsReportModalVisible(false);
      setNotice(result.alreadyExists
        ? 'You have already submitted a report for this discussion room.'
        : 'Thank you. Your report has been submitted for review.');
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsSubmittingReport(false);
    }
  }

  return (
    <Screen
      eyebrow="Investment Chat"
      title="Investment Chat"
      subtitle="Founder and Angel Investor keep a permanent private portfolio chat before and after funding."
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

          <TestFlightCard
            room={room}
            role={participantRole}
            isSaving={isSavingTestFlight}
            onToggle={handleToggleTestFlight}
          />

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
                      {item.documentUrl ? (
                        <Pressable style={styles.documentAttachment} onPress={() => handleOpenDocument(item.documentUrl as string)}>
                          <Text style={styles.attachmentText}>Open Document</Text>
                          <Text style={styles.documentName} numberOfLines={1}>
                            {item.documentName ?? fileNameFromUrl(item.documentUrl)}
                          </Text>
                        </Pressable>
                      ) : null}
                      {item.linkUrl ? <Text style={styles.attachmentText}>Link: {item.linkUrl}</Text> : null}
                      <View style={styles.messageMetaRow}>
                        <Text style={styles.messageMeta}>{formatMessageTime(item.createdAt)}</Text>
                        {authUser?.uid && room ? (
                          <Text style={styles.messageMeta}>{getMessageStatusLabel(item, room, authUser.uid)}</Text>
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
            {!blockStatus ? <Text style={styles.empty}>Checking community safety...</Text> : null}
            {blockStatus?.blockedByMe ? <Text style={styles.blockedNotice}>You have blocked this user.</Text> : null}
            {blockStatus?.blockedMe ? <Text style={styles.blockedNotice}>This user has blocked you.</Text> : null}
            {canUseComposer ? (
              <>
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
                <View style={styles.attachmentActions}>
                  <PrimaryButton
                    label={isUploadingAttachment ? 'Uploading...' : 'Attach Photo'}
                    variant="secondary"
                    onPress={handleAttachPhoto}
                    disabled={isUploadingAttachment}
                  />
                  <PrimaryButton
                    label={isUploadingAttachment ? 'Uploading...' : 'Attach Document'}
                    variant="secondary"
                    onPress={handleAttachDocument}
                    disabled={isUploadingAttachment}
                  />
                </View>
                {pendingImage ? (
                  <View style={styles.pendingAttachment}>
                    <Image source={{ uri: pendingImage.localUri }} style={styles.pendingImage} />
                    <PrimaryButton label="Remove Photo" variant="secondary" onPress={() => setPendingImage(null)} />
                  </View>
                ) : null}
                {pendingDocument ? (
                  <View style={styles.pendingDocument}>
                    <Text style={styles.pendingLabel}>Document ready to send</Text>
                    <Text style={styles.documentName} numberOfLines={1}>{pendingDocument.name}</Text>
                    <PrimaryButton label="Remove Document" variant="secondary" onPress={() => setPendingDocument(null)} />
                  </View>
                ) : null}
                {isUploadingAttachment ? <Text style={styles.uploadProgress}>Uploading attachment...</Text> : null}
                <PrimaryButton
                  label="Send Message"
                  onPress={handleSendMessage}
                  disabled={!canSendMessage}
                />
              </>
            ) : null}
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

          <BlockUserControl
            currentUserId={authUser?.uid}
            targetUserId={counterpartyId}
            currentUser={profile}
            targetUser={counterpartyProfile}
            targetName={counterpartyName}
            onStatusChange={setBlockStatus}
            onReport={handleReportConversation}
            showReport
          />
        </>
      ) : null}
      <ReportUserModal
        visible={isReportModalVisible}
        reason={reportReason}
        details={reportDetails}
        isSubmitting={isSubmittingReport}
        onChangeReason={setReportReason}
        onChangeDetails={setReportDetails}
        onCancel={() => setIsReportModalVisible(false)}
        onSubmit={handleSubmitReport}
      />
    </Screen>
  );
}

function ReportUserModal({
  visible,
  reason,
  details,
  isSubmitting,
  onChangeReason,
  onChangeDetails,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  reason: DiscussionReportReason;
  details: string;
  isSubmitting: boolean;
  onChangeReason: (reason: DiscussionReportReason) => void;
  onChangeDetails: (details: string) => void;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  const requiresDetails = reason === 'Other';
  const canSubmit = !isSubmitting && (!requiresDetails || details.trim().length > 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Report User</Text>
          <Text style={styles.modalSubtitle}>
            Help us understand what happened. Reports are reviewed by the PromptFund Trust & Safety team.
          </Text>
          <View style={styles.reasonList}>
            {reportReasons.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === item }}
                onPress={() => onChangeReason(item)}
                style={[styles.reasonOption, reason === item ? styles.reasonOptionActive : null]}
              >
                <View style={[styles.radioDot, reason === item ? styles.radioDotActive : null]} />
                <Text style={styles.reasonText}>{item}</Text>
              </Pressable>
            ))}
          </View>
          {requiresDetails ? (
            <TextInput
              multiline
              placeholder="Describe what happened..."
              placeholderTextColor={colors.subtle}
              value={details}
              onChangeText={onChangeDetails}
              style={styles.reportTextArea}
            />
          ) : null}
          <View style={styles.modalActions}>
            <PrimaryButton label="Cancel" variant="secondary" onPress={onCancel} disabled={isSubmitting} />
            <PrimaryButton label={isSubmitting ? 'Submitting...' : 'Submit Report'} onPress={onSubmit} disabled={!canSubmit} />
          </View>
        </View>
      </View>
    </Modal>
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

function sortMessages(messages: DiscussionMessage[]) {
  return [...messages].sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
}

function areDiscussionRoomsEqual(left: DiscussionRoom | null, right: DiscussionRoom | null) {
  return stableStringify(left) === stableStringify(right);
}

function areDiscussionMessagesEqual(left: DiscussionMessage[], right: DiscussionMessage[]) {
  return stableStringify(left) === stableStringify(right);
}

function stableStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatMessageTime(value: unknown) {
  try {
    const date = toDate(value);
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
    const date = toDate(value);
    const today = startOfDay(new Date());
    const messageDay = startOfDay(date);
    const dayDifference = Math.round((today.getTime() - messageDay.getTime()) / 86_400_000);

    if (dayDifference === 0) {
      return 'Today';
    }
    if (dayDifference === 1) {
      return 'Yesterday';
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function toDate(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(String(value));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isCounterpartyTyping(room: DiscussionRoom, currentUid: string) {
  return Object.entries(room.typingBy ?? {}).some(([uid, isTyping]) => uid !== currentUid && isTyping);
}

function getMessageStatusLabel(message: DiscussionMessage, room: DiscussionRoom, currentUid: string) {
  const otherUid = currentUid === room.founderId ? room.investorId : room.founderId;

  if (message.senderId !== currentUid) {
    return message.readBy?.includes(currentUid) ? '✓✓ Read' : 'Sent';
  }

  if (message.readBy?.includes(otherUid)) {
    return '✓✓ Read';
  }

  return message.deliveredTo?.includes(otherUid) ? '✓ Delivered' : 'Sent';
}

function mimeTypeFromFileName(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

function isSupportedDocumentType(contentType: string, fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return supportedDocumentTypes.includes(contentType) || ['pdf', 'doc', 'docx', 'txt'].includes(extension ?? '');
}

function fileNameFromUrl(url: string) {
  try {
    const decoded = decodeURIComponent(url);
    const path = decoded.split('/').pop()?.split('?')[0];
    return path || 'Investment document';
  } catch {
    return 'Investment document';
  }
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
  attachmentText: {
    color: colors.luxuryGold,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 20,
  },
  documentAttachment: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.34)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: 'rgba(200, 162, 74, 0.08)',
  },
  documentName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  attachmentActions: {
    gap: spacing.sm,
  },
  pendingAttachment: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.black,
  },
  pendingImage: {
    width: '100%',
    height: 180,
    borderRadius: radii.md,
    backgroundColor: colors.panelMuted,
  },
  pendingDocument: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.black,
  },
  pendingLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  uploadProgress: {
    color: colors.luxuryGold,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
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
  blockedNotice: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.36)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: 'rgba(177, 18, 38, 0.12)',
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 22,
    textAlign: 'center',
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  modalCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.26)',
    borderRadius: radii.lg,
    padding: spacing.lg,
    backgroundColor: colors.panel,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  reasonList: {
    gap: spacing.sm,
  },
  reasonOption: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.black,
  },
  reasonOptionActive: {
    borderColor: colors.luxuryGold,
    backgroundColor: 'rgba(200, 162, 74, 0.12)',
  },
  radioDot: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 7,
  },
  radioDotActive: {
    borderColor: colors.luxuryGold,
    backgroundColor: colors.luxuryGold,
  },
  reasonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  reportTextArea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.black,
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: spacing.sm,
  },
});
