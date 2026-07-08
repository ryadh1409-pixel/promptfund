import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { getCounterpartyTypingLabel } from '@/components/investment-chat/chatUtils';
import { muteDurationToExpiry } from '@/firebase/chatSafety';
import { chatBlockService } from '@/services/chat/blockService';
import { chatMessageService } from '@/services/chat/messageService';
import { chatMuteService } from '@/services/chat/muteService';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentChatService } from '@/services/investmentChatService';
import { userService, type BlockStatus } from '@/services/userService';
import type { DiscussionRoom } from '@/types/InvestmentFlow';
import type { ChatMessage } from '@/types/InvestmentChat';
import type { ChatMuteDuration } from '@/types/ChatSafety';
import type { User } from '@/types/User';
import type { LocalChatAttachmentInput } from '@/utils/chatAttachments';

type ChatRoomContextValue = {
  room: DiscussionRoom;
  messages: ChatMessage[];
  olderMessages: ChatMessage[];
  allMessages: ChatMessage[];
  isLoadingOlder: boolean;
  hasMore: boolean;
  counterparty: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role' | 'photoURL'> | null;
  blockStatus: BlockStatus;
  isMuted: boolean;
  typingLabel: string | null;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (text: string, localAttachments: LocalChatAttachmentInput[]) => Promise<void>;
  blockCounterparty: () => Promise<void>;
  unblockCounterparty: () => Promise<void>;
  muteConversation: (duration: ChatMuteDuration) => Promise<void>;
  unmuteConversation: () => Promise<void>;
};

type ChatRoomProviderProps = PropsWithChildren<{
  roomId: string;
  initialRoom: DiscussionRoom;
  currentUser: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role'>;
  onError: (message: string) => void;
}>;

type ListenerLifecycleReason =
  | 'component-mounted'
  | 'roomId-changed'
  | 'component-unmounted'
  | 'dependency-changed'
  | 'screen-focus-changed';

const defaultBlockStatus: BlockStatus = {
  blockedByMe: false,
  blockedMe: false,
};

const profileCache = new Map<string, User | null>();
const blockStatusCache = new Map<string, BlockStatus>();
const activeRoomListenerCounts = new Map<string, number>();

const ChatRoomContext = createContext<ChatRoomContextValue | null>(null);

function cacheKey(currentUid: string, targetUid: string) {
  return `${currentUid}__${targetUid}`;
}

function toRoomParticipant(
  profile: User | null,
): Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role' | 'photoURL'> | null {
  if (!profile) return null;
  return {
    id: profile.id,
    displayName: profile.displayName,
    name: profile.name,
    username: profile.username,
    handle: profile.handle,
    activeRole: profile.activeRole,
    roles: profile.roles,
    role: profile.role,
    photoURL: profile.photoURL,
  };
}

function pickLiveRoomFields(room: DiscussionRoom): Partial<DiscussionRoom> {
  return {
    lastMessage: room.lastMessage,
    lastMessageAt: room.lastMessageAt,
    lastMessageSenderId: room.lastMessageSenderId,
    unreadCounts: room.unreadCounts,
    readReceipts: room.readReceipts,
    typingBy: room.typingBy,
    mutedUntil: room.mutedUntil,
    updatedAt: room.updatedAt,
    founderReady: room.founderReady,
    investorReady: room.investorReady,
    status: room.status,
  };
}

function logListenerLifecycle(
  event: 'created' | 'destroyed',
  roomId: string,
  reason: ListenerLifecycleReason,
  activeListenerCount: number,
) {
  const payload = { roomId, reason, activeListenerCount };
  if (event === 'created') {
    console.info('[PromptFund Chat] Listener Created', payload);
    if (activeListenerCount > 1) {
      console.warn('[PromptFund Chat] Duplicate room listener detected', payload);
    }
    return;
  }
  console.info('[PromptFund Chat] Listener Destroyed', payload);
}

export function ChatRoomProvider({
  roomId,
  initialRoom,
  currentUser,
  onError,
  children,
}: ChatRoomProviderProps) {
  const [room, setRoom] = useState(initialRoom);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [counterparty, setCounterparty] = useState<Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle' | 'activeRole' | 'roles' | 'role' | 'photoURL'> | null>(null);
  const [blockStatus, setBlockStatus] = useState<BlockStatus>(defaultBlockStatus);

  const onErrorRef = useRef(onError);
  const currentUserRef = useRef(currentUser);
  const previousRoomIdRef = useRef(roomId);
  const latestRoomIdRef = useRef(roomId);
  const previousListenerRoomIdRef = useRef<string | null>(null);

  onErrorRef.current = onError;
  currentUserRef.current = currentUser;
  latestRoomIdRef.current = roomId;

  const counterpartyId = useMemo(() => {
    if (room.founderId === currentUser.id) return room.investorId;
    if (room.investorId === currentUser.id) return room.founderId;
    return null;
  }, [currentUser.id, room.founderId, room.investorId]);

  const allMessages = useMemo(
    () => [...olderMessages, ...messages].filter((message, index, array) => array.findIndex((item) => item.id === message.id) === index),
    [messages, olderMessages],
  );

  const isMuted = useMemo(
    () => chatMuteService.isConversationMuted(room, currentUser.id),
    [currentUser.id, room.mutedUntil],
  );

  const typingLabel = useMemo(
    () => getCounterpartyTypingLabel(room, currentUser.id),
    [currentUser.id, room.typingBy, counterpartyId],
  );

  useEffect(() => {
    setRoom((current) => {
      if (current.id !== initialRoom.id) {
        return initialRoom;
      }
      return { ...current, ...pickLiveRoomFields(initialRoom) };
    });
  }, [initialRoom]);

  useEffect(() => {
    if (previousRoomIdRef.current === roomId) return;
    previousRoomIdRef.current = roomId;
    setRoom(initialRoom);
    setMessages([]);
    setOlderMessages([]);
    setHasMore(true);
    setBlockStatus(defaultBlockStatus);
  }, [initialRoom, roomId]);

  useEffect(() => {
    if (!counterpartyId) {
      setBlockStatus(defaultBlockStatus);
      return;
    }

    const key = cacheKey(currentUser.id, counterpartyId);
    const cached = blockStatusCache.get(key);
    if (cached) {
      setBlockStatus(cached);
      return;
    }

    let cancelled = false;
    chatBlockService.getBlockStatus(currentUser.id, counterpartyId)
      .then((nextStatus) => {
        if (cancelled) return;
        blockStatusCache.set(key, nextStatus);
        setBlockStatus(nextStatus);
      })
      .catch((error) => onErrorRef.current(getFriendlyErrorMessage(error)));

    return () => {
      cancelled = true;
    };
  }, [counterpartyId, currentUser.id, roomId]);

  useEffect(() => {
    if (!counterpartyId) {
      setCounterparty(null);
      return undefined;
    }

    const cachedProfile = profileCache.get(counterpartyId);
    if (cachedProfile !== undefined) {
      setCounterparty(toRoomParticipant(cachedProfile));
      return undefined;
    }

    let cancelled = false;
    userService.getUserById(counterpartyId)
      .then((profile) => {
        profileCache.set(counterpartyId, profile);
        if (!cancelled) {
          setCounterparty(toRoomParticipant(profile));
        }
      })
      .catch((error) => onErrorRef.current(getFriendlyErrorMessage(error)));

    return () => {
      cancelled = true;
    };
  }, [counterpartyId, roomId]);

  useEffect(() => {
    const subscribedRoomId = roomId;
    const createReason: ListenerLifecycleReason = previousListenerRoomIdRef.current === null
      ? 'component-mounted'
      : previousListenerRoomIdRef.current !== subscribedRoomId
        ? 'roomId-changed'
        : 'dependency-changed';

    previousListenerRoomIdRef.current = subscribedRoomId;

    const nextCount = (activeRoomListenerCounts.get(subscribedRoomId) ?? 0) + 1;
    activeRoomListenerCounts.set(subscribedRoomId, nextCount);
    logListenerLifecycle('created', subscribedRoomId, createReason, nextCount);

    const unsubscribe = investmentChatService.subscribeToMessages(
      subscribedRoomId,
      (nextMessages) => {
        setMessages(nextMessages);
        if (nextMessages.length < 40) {
          setHasMore(false);
        }
      },
      (error) => onErrorRef.current(getFriendlyErrorMessage(error)),
    );

    return () => {
      unsubscribe();
      const destroyReason: ListenerLifecycleReason = latestRoomIdRef.current !== subscribedRoomId
        ? 'roomId-changed'
        : 'component-unmounted';

      const currentCount = activeRoomListenerCounts.get(subscribedRoomId) ?? 1;
      const reducedCount = Math.max(0, currentCount - 1);
      if (reducedCount === 0) {
        activeRoomListenerCounts.delete(subscribedRoomId);
      } else {
        activeRoomListenerCounts.set(subscribedRoomId, reducedCount);
      }
      logListenerLifecycle('destroyed', subscribedRoomId, destroyReason, reducedCount);
    };
  }, [roomId]);

  const loadOlderMessages = useCallback(async () => {
    if (!hasMore || isLoadingOlder || allMessages.length === 0) return;
    const oldest = allMessages[0];
    try {
      setIsLoadingOlder(true);
      const batch = await investmentChatService.loadOlderMessages(roomId, oldest);
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
    } finally {
      setIsLoadingOlder(false);
    }
  }, [allMessages, hasMore, isLoadingOlder, roomId]);

  const sendMessage = useCallback(async (text: string, localAttachments: LocalChatAttachmentInput[]) => {
    await chatMessageService.sendMessage({
      roomId,
      sender: currentUserRef.current,
      text,
      localAttachments,
    });
  }, [roomId]);

  const blockCounterparty = useCallback(async () => {
    if (!counterparty) return;
    await chatBlockService.blockUser({ blocker: currentUserRef.current, blocked: counterparty });
    setBlockStatus((current) => {
      const nextStatus: BlockStatus = {
        ...current,
        blockedByMe: true,
      };
      blockStatusCache.set(cacheKey(currentUserRef.current.id, counterparty.id), nextStatus);
      return nextStatus;
    });
  }, [counterparty]);

  const unblockCounterparty = useCallback(async () => {
    if (!counterparty) return;
    await chatBlockService.unblockUser(currentUserRef.current.id, counterparty.id);
    setBlockStatus((current) => {
      const nextStatus: BlockStatus = {
        ...current,
        blockedByMe: false,
        myBlock: undefined,
      };
      blockStatusCache.set(cacheKey(currentUserRef.current.id, counterparty.id), nextStatus);
      return nextStatus;
    });
  }, [counterparty]);

  const muteConversation = useCallback(async (duration: ChatMuteDuration) => {
    await chatMuteService.muteConversation(roomId, currentUserRef.current.id, duration);
    const mutedUntil = muteDurationToExpiry(duration);
    setRoom((current) => ({
      ...current,
      mutedUntil: {
        ...(current.mutedUntil ?? {}),
        [currentUserRef.current.id]: mutedUntil,
      },
    }));
  }, [roomId]);

  const unmuteConversation = useCallback(async () => {
    await chatMuteService.unmuteConversation(roomId, currentUserRef.current.id);
    setRoom((current) => ({
      ...current,
      mutedUntil: {
        ...(current.mutedUntil ?? {}),
        [currentUserRef.current.id]: null,
      },
    }));
  }, [roomId]);

  const value = useMemo<ChatRoomContextValue>(() => ({
    room,
    messages,
    olderMessages,
    allMessages,
    isLoadingOlder,
    hasMore,
    counterparty,
    blockStatus,
    isMuted,
    typingLabel,
    loadOlderMessages,
    sendMessage,
    blockCounterparty,
    unblockCounterparty,
    muteConversation,
    unmuteConversation,
  }), [
    room,
    messages,
    olderMessages,
    allMessages,
    isLoadingOlder,
    hasMore,
    counterparty,
    blockStatus,
    isMuted,
    typingLabel,
    loadOlderMessages,
    sendMessage,
    blockCounterparty,
    unblockCounterparty,
    muteConversation,
    unmuteConversation,
  ]);

  return <ChatRoomContext.Provider value={value}>{children}</ChatRoomContext.Provider>;
}

export function useChatRoom() {
  const context = useContext(ChatRoomContext);
  if (!context) {
    throw new Error('useChatRoom must be used inside ChatRoomProvider.');
  }
  return context;
}
