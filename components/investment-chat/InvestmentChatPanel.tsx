import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ChatSettings, ChatSettingsButton } from '@/components/chat/ChatSettings';
import { ChatLoadingOverlay, ChatToastBanner, useMessageActions } from '@/hooks/chat/useMessageActions';
import { colors, radii, spacing } from '@/constants/theme';
import { chatMessageService } from '@/services/chat/messageService';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentChatService } from '@/services/investmentChatService';
import type { BlockStatus } from '@/services/userService';
import type { DiscussionRoom } from '@/types/InvestmentFlow';
import type { ChatMessage, ChatReaction } from '@/types/InvestmentChat';
import type { ChatToastPayload } from '@/types/ChatSafety';
import type { User } from '@/types/User';
import { logChatUploadStep } from '@/utils/chatUpload';
import type { LocalChatAttachmentInput } from '@/utils/chatAttachments';

import { ChatComposer } from './ChatComposer';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import {
  buildChatListItems,
  getCounterpartyTypingLabel,
  type ChatListItem,
} from './chatUtils';

type InvestmentChatPanelProps = {
  room: DiscussionRoom;
  currentUser: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role'>;
  counterparty?: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role' | 'photoURL'> | null;
  participantRole: 'founder' | 'investor' | null;
  blockStatus: BlockStatus;
  bottomInset?: number;
  onNotice: (message: string | null) => void;
  onSettingsPress?: () => void;
  onReportUser?: () => void;
  onConversationDeleted?: () => void;
  onBlocked?: () => void;
  embedded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function InvestmentChatPanel({
  room,
  currentUser,
  counterparty = null,
  participantRole,
  blockStatus,
  bottomInset = 0,
  onNotice,
  onSettingsPress,
  onReportUser,
  onConversationDeleted,
  onBlocked,
  embedded = false,
  style,
}: InvestmentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [toast, setToast] = useState<ChatToastPayload | null>(null);
  const listRef = useRef<FlatList<ChatListItem> | null>(null);
  const lastTypingRef = useRef<boolean | null>(null);
  const deliveredRef = useRef<string>('');
  const prevMessageCountRef = useRef(0);

  const unreadCount = room.unreadCounts?.[currentUser.id] ?? 0;
  const isBlocked = blockStatus.blockedByMe || blockStatus.blockedMe;
  const canParticipate = participantRole !== null;
  const typingLabel = getCounterpartyTypingLabel(room, currentUser.id);

  const handleToast = useCallback((payload: ChatToastPayload) => {
    setToast(payload);
    if (payload.type === 'error') {
      onNotice(payload.message);
    } else {
      onNotice(null);
    }
    setTimeout(() => setToast(null), 3200);
  }, [onNotice]);

  const {
    openMessageActions,
    reportDialog,
    androidActionSheet,
    isReporting,
  } = useMessageActions({
    roomId: room.id,
    currentUser,
    counterparty,
    onToast: handleToast,
    onBlocked,
  });

  const allMessages = useMemo(
    () => [...olderMessages, ...messages].filter((message, index, array) => array.findIndex((item) => item.id === message.id) === index),
    [messages, olderMessages],
  );

  const listData = useMemo(() => [...buildChatListItems(allMessages)].reverse(), [allMessages]);

  useEffect(() => {
    const unsubscribe = investmentChatService.subscribeToMessages(
      room.id,
      (nextMessages) => {
        setMessages(nextMessages);
        if (nextMessages.length < 40) {
          setHasMore(false);
        }
      },
      (error) => onNotice(getFriendlyErrorMessage(error)),
    );
    return unsubscribe;
  }, [onNotice, room.id]);

  useEffect(() => {
    if (allMessages.length === 0) return;
    const signature = allMessages.map((message) => message.id).join('|');
    if (deliveredRef.current === signature) return;
    deliveredRef.current = signature;

    investmentChatService.markMessagesDelivered(room, currentUser.id, allMessages).catch(() => undefined);
    investmentChatService.markMessagesRead(room, currentUser.id, allMessages).catch(() => undefined);
  }, [allMessages, currentUser.id, room]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      const latest = messages[messages.length - 1];
      if (latest?.type === 'image' || latest?.attachmentUrl) {
        logChatUploadStep('7. Image message visible in chat list', {
          messageId: latest.id,
          type: latest.type,
          attachmentUrl: latest.attachmentUrl,
        });
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    const isTyping = draft.trim().length > 0;
    if (lastTypingRef.current === isTyping) return;
    lastTypingRef.current = isTyping;
    investmentChatService.setTyping(room, currentUser.id, isTyping).catch(() => undefined);
    if (!isTyping) return undefined;
    const timeout = setTimeout(() => {
      investmentChatService.setTyping(room, currentUser.id, false).catch(() => undefined);
      lastTypingRef.current = false;
    }, 1600);
    return () => clearTimeout(timeout);
  }, [currentUser.id, draft, room]);

  const handleLoadOlder = useCallback(async () => {
    if (!hasMore || isLoadingOlder || allMessages.length === 0) return;
    const oldest = allMessages[0];
    try {
      setIsLoadingOlder(true);
      const batch = await investmentChatService.loadOlderMessages(room.id, oldest);
      if (batch.length === 0) {
        setHasMore(false);
        return;
      }
      setOlderMessages((current) => {
        const merged = [...batch, ...current];
        return merged.filter((message, index, array) => array.findIndex((item) => item.id === message.id) === index);
      });
      if (batch.length < 40) {
        setHasMore(false);
      }
    } catch (error) {
      onNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsLoadingOlder(false);
    }
  }, [allMessages, hasMore, isLoadingOlder, onNotice, room.id]);

  const handleOpenUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      onNotice(getFriendlyErrorMessage(error));
    }
  }, [onNotice]);

  const handleSend = useCallback(async ({ text, localAttachments }: { text: string; localAttachments: LocalChatAttachmentInput[] }) => {
    try {
      onNotice(null);
      await chatMessageService.sendMessage({
        roomId: room.id,
        sender: currentUser,
        text,
        localAttachments,
      });
      setDraft('');
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error) {
      const message = getFriendlyErrorMessage(error);
      handleToast({ type: 'error', message });
      throw error;
    }
  }, [currentUser, handleToast, onNotice, room.id]);

  const handleLongPress = useCallback((message: ChatMessage) => {
    openMessageActions(message);
  }, [openMessageActions]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedMessage) return;
    try {
      await investmentChatService.editMessage(selectedMessage, currentUser.id, editDraft);
      setIsEditModalVisible(false);
      setSelectedMessage(null);
      setEditDraft('');
    } catch (error) {
      onNotice(getFriendlyErrorMessage(error));
    }
  }, [currentUser.id, editDraft, onNotice, selectedMessage]);

  const openSettings = useCallback(() => {
    if (onSettingsPress) {
      onSettingsPress();
      return;
    }
    setIsSettingsVisible(true);
  }, [onSettingsPress]);

  const renderItem = useCallback(({ item }: { item: ChatListItem }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateWrap}>
          <Text style={styles.dateLabel}>{item.label}</Text>
        </View>
      );
    }

    return (
      <MessageBubble
        message={item.message}
        currentUserId={currentUser.id}
        isFounder={participantRole === 'founder'}
        onOpenUrl={handleOpenUrl}
        onLongPress={handleLongPress}
        onToggleReaction={(message, reaction) => {
          investmentChatService.toggleReaction(message, currentUser.id, reaction as ChatReaction).catch((error) => {
            onNotice(getFriendlyErrorMessage(error));
          });
        }}
      />
    );
  }, [currentUser.id, handleLongPress, handleOpenUrl, onNotice, participantRole]);

  return (
    <View style={[styles.container, embedded ? styles.containerEmbedded : null, style]}>
      {embedded ? (
        <View style={styles.embeddedHeader}>
          <View style={styles.embeddedHeaderCopy}>
            <Text style={styles.embeddedTitle}>Investment Chat</Text>
            {unreadCount > 0 ? <Text style={styles.embeddedUnread}>{unreadCount} unread</Text> : null}
          </View>
          <ChatSettingsButton onPress={openSettings} />
        </View>
      ) : (
        <ChatHeader unreadCount={unreadCount} onSettingsPress={openSettings} />
      )}

      <View style={[styles.messagesArea, embedded ? styles.messagesAreaEmbedded : null]}>
        <ChatToastBanner toast={toast} />
        {listData.length === 0 ? (
          <ChatEmptyState />
        ) : (
          <FlatList
            ref={listRef}
            inverted
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onEndReached={handleLoadOlder}
            onEndReachedThreshold={0.2}
            initialNumToRender={18}
            maxToRenderPerBatch={24}
            windowSize={12}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.listContent}
            ListFooterComponent={isLoadingOlder ? (
              <View style={styles.loader}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null}
          />
        )}
      </View>

      {typingLabel ? <Text style={styles.typing}>{typingLabel}</Text> : null}
      {blockStatus.blockedByMe ? <Text style={styles.blocked}>You have blocked this user.</Text> : null}
      {blockStatus.blockedMe ? <Text style={styles.blocked}>This user has blocked you.</Text> : null}

      {canParticipate ? (
        <View style={embedded ? styles.composerWrap : null}>
          <ChatComposer
            roomId={room.id}
            userId={currentUser.id}
            value={draft}
            bottomInset={bottomInset}
            disabled={isBlocked}
            embedded={embedded}
            onChangeText={setDraft}
            onSend={handleSend}
            onError={(message) => handleToast({ type: 'error', message })}
          />
        </View>
      ) : null}

      <Modal visible={isEditModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit message</Text>
            <TextInput
              multiline
              value={editDraft}
              onChangeText={setEditDraft}
              style={styles.modalInput}
              placeholderTextColor={colors.subtle}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setIsEditModalVisible(false)} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveEdit} style={styles.modalButtonPrimary}>
                <Text style={styles.modalButtonPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ChatSettings
        visible={isSettingsVisible}
        room={room}
        currentUser={currentUser}
        counterparty={counterparty}
        messages={allMessages}
        onClose={() => setIsSettingsVisible(false)}
        onToast={handleToast}
        onReportUser={() => {
          setIsSettingsVisible(false);
          onReportUser?.();
        }}
        onConversationDeleted={onConversationDeleted}
        onBlocked={onBlocked}
      />

      {reportDialog}
      {androidActionSheet}
      <ChatLoadingOverlay visible={isReporting} label="Submitting report..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  containerEmbedded: {
    backgroundColor: colors.panelMuted,
  },
  embeddedHeader: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderBottomColor: 'rgba(216, 201, 163, 0.16)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  embeddedHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  embeddedTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  embeddedUnread: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  messagesArea: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.sm,
  },
  messagesAreaEmbedded: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  composerWrap: {
    backgroundColor: colors.panel,
    paddingTop: spacing.sm,
  },
  listContent: {
    gap: 4,
    paddingBottom: 4,
    paddingTop: 8,
  },
  dateWrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  dateLabel: {
    backgroundColor: colors.panelMuted,
    borderRadius: radii.pill,
    color: colors.muted,
    fontSize: 12,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  typing: {
    color: colors.accent,
    fontSize: 11,
    fontStyle: 'italic',
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
  },
  blocked: {
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
  },
  loader: {
    paddingVertical: spacing.md,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    width: '100%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: colors.panelMuted,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    minHeight: 100,
    padding: spacing.sm,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalButtonText: {
    color: colors.muted,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalButtonPrimaryText: {
    color: colors.black,
    fontWeight: '700',
  },
});
