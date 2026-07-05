import { getFirebaseAuth } from '@/firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { firestoreAdapter, firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { AppError } from '@/services/errorHandler';
import { notificationService } from '@/services/notificationService';
import { userService } from '@/services/userService';
import type { BlockStatus } from '@/services/userService';
import type {
  CreateInvestmentOpportunityInput,
  DiscussionMessage,
  DiscussionRoom,
  InvestmentAgreement,
  InvestmentOpportunity,
  StartupInterest,
  V5Investment,
} from '@/types/InvestmentFlow';
import type { InvestmentInterest, Match } from '@/types/FundingRequest';
import type { Project } from '@/types/Project';
import type { ActivityTimelineEvent, ModerationFlag, User } from '@/types/User';
import { moderateChatMessage } from '@/utils/chatModeration';
import {
  logTractionFlowStep,
  logTractionInvestmentWrite,
} from '@/utils/tractionPortfolio';
import { investmentChatService, normalizeChatMessage } from '@/services/investmentChatService';
import type { ChatAttachment } from '@/types/InvestmentChat';

export const defaultInvestmentAmount = 22;
export const defaultInvestorAllocation = 1;
export const defaultStartupStage = 'MVP';
export const defaultInvestmentPurpose = 'Fund one month of AI development tools and product growth.';
export const startupOpportunitiesCollection = 'startupOpportunities';

function now() {
  return new Date().toISOString();
}

function displayName(profile: Pick<User, 'displayName' | 'name' | 'username' | 'handle'> | null | undefined) {
  return profile?.displayName ?? profile?.name ?? profile?.username ?? profile?.handle ?? 'PromptFund Member';
}

function buildTractionInvestmentPayload(
  agreement: InvestmentAgreement,
  status: 'funding_confirmed' | 'completed',
  timestamps: { fundedAt?: string; createdAt?: string; completedAt?: string },
  opportunity?: InvestmentOpportunity | null,
): Omit<V5Investment, 'id'> {
  const completedAt = status === 'completed'
    ? (timestamps.completedAt ?? timestamps.fundedAt ?? agreement.completedAt ?? now())
    : undefined;
  const fundedAt = timestamps.fundedAt
    ?? agreement.fundingArrangedAt
    ?? completedAt
    ?? now();
  const createdAt = timestamps.createdAt
    ?? agreement.fundingArrangedAt
    ?? agreement.createdAt
    ?? fundedAt;
  const fundedAmount = agreement.investmentAmount;

  return {
    agreementId: agreement.id,
    discussionRoomId: agreement.discussionRoomId,
    opportunityId: agreement.opportunityId,
    startupId: agreement.opportunityId,
    startupImage: opportunity?.imageUrl ?? '',
    founderId: agreement.founderId,
    founderName: agreement.founderName,
    investorId: agreement.investorId,
    investorName: agreement.investorName,
    startupName: agreement.startupName,
    amount: fundedAmount,
    fundedAmount,
    allocation: agreement.investorAllocation,
    status,
    isPortfolio: true,
    isTraction: true,
    fundedAt,
    completedAt,
    createdAt,
  };
}

function assertCompletedPortfolioPayload(payload: Omit<V5Investment, 'id'>) {
  const missing = [
    ['status', payload.status],
    ['founderId', payload.founderId],
    ['investorId', payload.investorId],
    ['opportunityId', payload.opportunityId],
    ['startupId', payload.startupId],
    ['startupName', payload.startupName],
    ['founderName', payload.founderName],
    ['fundedAmount', payload.fundedAmount],
    ['allocation', payload.allocation],
    ['completedAt', payload.completedAt],
    ['isPortfolio', payload.isPortfolio],
    ['isTraction', payload.isTraction],
  ].filter(([, value]) => value === undefined || value === null || value === '')
    .map(([field]) => field)
    .filter((field) => field !== 'startupImage');

  if (payload.status === 'completed' && missing.length > 0) {
    throw new AppError(
      `Completed investment is missing required portfolio fields: ${missing.join(', ')}`,
      'traction/incomplete-portfolio-payload',
    );
  }
}

async function commitPortfolioInvestmentTransaction({
  agreement,
  investmentPayload,
  agreementUpdate,
  discussionRoomStatus,
  opportunityStatus,
}: {
  agreement: InvestmentAgreement;
  investmentPayload: Omit<V5Investment, 'id'>;
  agreementUpdate: Partial<InvestmentAgreement>;
  discussionRoomStatus: InvestmentOpportunity['status'];
  opportunityStatus: InvestmentOpportunity['status'];
}) {
  const database = getPromptFundFirestore();
  const batch = writeBatch(database);
  const writePayload = omitUndefinedFields(investmentPayload);

  batch.set(
    doc(database, firestoreCollections.investments, agreement.id),
    {
      ...writePayload,
      updatedAt: serverTimestamp(),
    },
  );
  batch.update(
    doc(database, firestoreCollections.agreements, agreement.id),
    {
      ...agreementUpdate,
      updatedAt: serverTimestamp(),
    },
  );
  batch.update(
    doc(database, firestoreCollections.discussionRooms, agreement.discussionRoomId),
    {
      status: discussionRoomStatus,
      updatedAt: serverTimestamp(),
    },
  );
  batch.update(
    doc(database, firestoreCollections.startupOpportunities, agreement.opportunityId),
    {
      status: opportunityStatus,
      updatedAt: serverTimestamp(),
    },
  );

  await batch.commit();

  logTractionInvestmentWrite({
    documentId: agreement.id,
    status: String(investmentPayload.status),
    founderId: investmentPayload.founderId ?? undefined,
    investorId: investmentPayload.investorId,
    payload: writePayload,
  });

  return {
    ...investmentPayload,
    id: agreement.id,
  };
}

async function writePortfolioInvestment(
  agreement: InvestmentAgreement,
  status: 'funding_confirmed' | 'completed',
  timestamps: { fundedAt?: string; createdAt?: string; completedAt?: string },
  transaction: {
    agreementUpdate: Partial<InvestmentAgreement>;
    discussionRoomStatus: InvestmentOpportunity['status'];
    opportunityStatus: InvestmentOpportunity['status'];
  },
) {
  if (!agreement.founderId || !agreement.investorId || !agreement.opportunityId) {
    throw new AppError(
      'Agreement is missing founder, investor, or startup details required for Traction.',
      'traction/invalid-agreement',
    );
  }

  const opportunity = await firestoreAdapter.getById<InvestmentOpportunity>(
    'startupOpportunities',
    agreement.opportunityId,
  );
  const payload = buildTractionInvestmentPayload(agreement, status, timestamps, opportunity);

  if (status === 'completed') {
    assertCompletedPortfolioPayload(payload);
  }

  logTractionFlowStep({
    step: 'investment-write-start',
    collection: 'investments',
    documentId: agreement.id,
    data: {
      ...payload,
      agreementStatus: agreement.status,
    },
  });

  return commitPortfolioInvestmentTransaction({
    agreement,
    investmentPayload: payload,
    ...transaction,
  });
}

function normalizeInvestment(investment: V5Investment): V5Investment {
  return {
    ...investment,
    status: investment.status ?? 'active',
    allocation: investment.allocation ?? 0,
  };
}

function sortByCreatedAt<T extends { createdAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? '')));
}

function omitUndefinedFields<T extends object>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

function flowId(prefix: string, ...parts: string[]) {
  return `${prefix}-${parts.join('-')}`.replace(/[^A-Za-z0-9_-]/g, '-');
}

function currentUid() {
  return getFirebaseAuth().currentUser?.uid ?? null;
}

function isPermissionDenied(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === 'permission-denied';
}

function recordTimeline(input: Omit<ActivityTimelineEvent, 'id' | 'createdAt'>) {
  return firestoreAdapter.create<Omit<ActivityTimelineEvent, 'id'>>('activityTimeline', {
    ...input,
    createdAt: now(),
  }).catch((error) => console.info('[PromptFund Timeline] write failed', error));
}

async function notifyAdmins(title: string, body: string, type: 'startup' | 'interest' | 'match' | 'discussion' | 'agreement_signed' | 'funding_confirmed' | 'report' | 'block' | 'startup_archived', data?: Record<string, string>) {
  try {
    const admins = (await userService.listUsers()).filter((user) => user.role === 'admin');
    await Promise.all(admins.map((admin) => notificationService.createNotification({
      userId: admin.id,
      title,
      body,
      type,
      data,
    })));
  } catch (error) {
    console.info('[PromptFund Notifications] admin notification failed', error);
  }
}

export function mapProjectToOpportunity(project: Project): InvestmentOpportunity {
  const title = project.startupName ?? project.title ?? 'Startup';
  const description = project.description || defaultInvestmentPurpose;
  const fundingGoal = project.goalAmount && project.goalAmount > 0 ? project.goalAmount : defaultInvestmentAmount;
  const equity = project.equityOffered ?? defaultInvestorAllocation;

  return {
    id: project.id,
    title,
    startupName: title,
    founderId: project.ownerId ?? project.founderId ?? project.developerId,
    founderName: project.founderName ?? 'Founder',
    description,
    fundingGoal,
    askAmount: fundingGoal,
    equity,
    fundingNeeded: fundingGoal,
    investorAllocation: equity,
    stage: project.stage ?? defaultStartupStage,
    purpose: description,
    shortDescription: description,
    imageUrl: project.imageUrl ?? project.coverImage,
    status: 'active',
  };
}

export const investmentFlowService = {
  async getOpportunity(opportunityId: string): Promise<InvestmentOpportunity | null> {
    return firestoreAdapter.getById<InvestmentOpportunity>('startupOpportunities', opportunityId);
  },

  async listOpportunitiesByFounder(founderId: string): Promise<InvestmentOpportunity[]> {
    return firestoreAdapter.queryByField<InvestmentOpportunity>('startupOpportunities', 'founderId', founderId);
  },

  async createOpportunity(input: CreateInvestmentOpportunityInput): Promise<InvestmentOpportunity> {
    const opportunity = await firestoreAdapter.create<Omit<InvestmentOpportunity, 'id'>>('startupOpportunities', {
      ...input,
      status: input.status ?? 'active',
    });
    await notifyAdmins('New startup', `${opportunity.startupName} was published by ${opportunity.founderName}.`, 'startup', {
      startupId: opportunity.id,
    });
    return opportunity;
  },

  async ensureOpportunityFromProject(project: Project): Promise<InvestmentOpportunity> {
    const existing = await this.getOpportunity(project.id);
    if (existing) {
      return existing;
    }

    const opportunity = mapProjectToOpportunity(project);
    return firestoreAdapter.setWithId<Omit<InvestmentOpportunity, 'id'>>('startupOpportunities', project.id, {
      ...opportunity,
      status: 'active',
    });
  },

  async getDiscussionRoom(roomId: string): Promise<DiscussionRoom | null> {
    return firestoreAdapter.getById<DiscussionRoom>('discussionRooms', roomId);
  },

  async startDiscussion({
    opportunity,
    investorId,
    investorName,
  }: {
    opportunity: InvestmentOpportunity;
    investorId: string;
    investorName: string;
  }) {
    const startupName = opportunity.title ?? opportunity.startupName;
    const investmentAmount = opportunity.askAmount ?? opportunity.fundingGoal ?? opportunity.fundingNeeded;
    const investorAllocation = opportunity.equity ?? opportunity.investorAllocation;

    await firestoreAdapter.setWithId<Omit<InvestmentOpportunity, 'id'>>('startupOpportunities', opportunity.id, {
      ...opportunity,
      title: startupName,
      startupName,
      fundingGoal: investmentAmount,
      askAmount: investmentAmount,
      equity: investorAllocation,
      fundingNeeded: investmentAmount,
      investorAllocation,
      status: 'discussion_started',
    });

    const roomId = flowId('room', opportunity.id, investorId);
    const payload: DiscussionRoom = {
      id: roomId,
      roomId,
      startupOpportunityId: opportunity.id,
      opportunityId: opportunity.id,
      founderId: opportunity.founderId,
      founderName: opportunity.founderName,
      investorId,
      investorName,
      startupName,
      investmentAmount,
      investorAllocation,
      founderReady: false,
      investorReady: false,
      founderTestFlightReady: false,
      investorTestFlightReady: false,
      messages: [],
      status: 'active',
    };
    return firestoreAdapter.setWithId<DiscussionRoom>('discussionRooms', roomId, payload);
  },

  async addDiscussionMessage(
    room: DiscussionRoom,
    sender: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle'>,
    body: string,
    options: {
      imageUrl?: string;
      documentUrl?: string;
      documentName?: string;
      linkUrl?: string;
      type?: 'user' | 'system';
      blockStatus?: BlockStatus;
    } = {},
  ) {
    const attachments: ChatAttachment[] = [];
    if (options.imageUrl) {
      attachments.push({
        id: `image-${Date.now()}`,
        name: 'Image',
        url: options.imageUrl,
        mimeType: 'image/jpeg',
        kind: 'image',
      });
    }
    if (options.documentUrl) {
      attachments.push({
        id: `document-${Date.now()}`,
        name: options.documentName ?? 'Document',
        url: options.documentUrl,
        mimeType: 'application/pdf',
        kind: 'document',
      });
    }

    if (options.type === 'system') {
      const moderation = moderateChatMessage(body);
      if (!moderation.allowed) {
        throw new AppError('This message violates PromptFund Community Guidelines.', 'moderation/blocked-message');
      }
      const createdAt = now();
      await firestoreAdapter.create('discussionMessages', {
        discussionRoomId: room.id,
        senderId: 'system',
        senderName: 'PromptFund System',
        body,
        createdAt,
        type: 'system',
        status: 'sent',
      });
      return firestoreAdapter.update<DiscussionRoom>('discussionRooms', room.id, {
        lastMessage: body,
        lastMessageAt: createdAt,
        updatedAt: now(),
      });
    }

    return investmentChatService.sendMessage({
      room,
      sender,
      text: body,
      attachments,
      blockStatus: options.blockStatus,
    });
  },

  async markDiscussionRead(room: DiscussionRoom, userId: string) {
    const messages = await this.listMessagesByDiscussionRoom(room.id);
    const chatMessages = messages.map((message) => normalizeChatMessage(message.id, message as unknown as Record<string, unknown>));
    return investmentChatService.markMessagesRead(room, userId, chatMessages);
  },

  async setTyping(room: DiscussionRoom, userId: string, isTyping: boolean) {
    return investmentChatService.setTyping(room, userId, isTyping);
  },

  async setReady(room: DiscussionRoom, role: 'founder' | 'investor') {
    const founderReady = role === 'founder' ? true : room.founderReady;
    const investorReady = role === 'investor' ? true : room.investorReady;
    const status = founderReady && investorReady ? 'ready' : room.status;

    const readyPayload = {
      founderReady,
      investorReady,
      status,
    };
    const updatedRoom = await firestoreAdapter.update<DiscussionRoom>('discussionRooms', room.id, readyPayload);

    if (status === 'ready') {
      const agreement = await this.generateAgreement(updatedRoom);
      const agreementPayload = {
        agreementId: agreement.id,
        status: 'ready',
      } as const;
      return firestoreAdapter.update<DiscussionRoom>('discussionRooms', room.id, agreementPayload);
    }

    return updatedRoom;
  },

  async setTestFlightReady(room: DiscussionRoom, role: 'founder' | 'investor', isReady: boolean) {
    return firestoreAdapter.update<DiscussionRoom>('discussionRooms', room.id, {
      [role === 'founder' ? 'founderTestFlightReady' : 'investorTestFlightReady']: isReady,
    });
  },

  async getAgreement(agreementId: string): Promise<InvestmentAgreement | null> {
    return firestoreAdapter.getById<InvestmentAgreement>('agreements', agreementId);
  },

  async resolveDiscussionRoomId(investment: Pick<V5Investment, 'discussionRoomId' | 'agreementId' | 'opportunityId' | 'founderId'>): Promise<string | null> {
    if (investment.discussionRoomId) {
      return investment.discussionRoomId;
    }

    if (investment.agreementId) {
      const agreement = await this.getAgreement(investment.agreementId);
      if (agreement?.discussionRoomId) {
        return agreement.discussionRoomId;
      }
    }

    if (investment.opportunityId && investment.founderId) {
      const rooms = await this.listDiscussionRoomsByFounder(investment.founderId);
      const room = rooms.find((item) => item.opportunityId === investment.opportunityId);
      if (room) {
        return room.id;
      }
    }

    return null;
  },

  async generateAgreement(room: DiscussionRoom) {
    const agreementId = `agreement-${room.id}`;
    let existing: InvestmentAgreement | null = null;
    try {
      const snapshot = await getDoc(doc(getPromptFundFirestore(), 'agreements', agreementId));
      existing = snapshot.exists()
        ? ({ ...snapshot.data(), id: snapshot.id } as InvestmentAgreement)
        : null;
    } catch (error) {
      if (!isPermissionDenied(error)) {
        console.info('[PromptFund Agreement] pre-create read failed', error);
      }
    }

    if (existing) {
      return existing;
    }

    const payload: Omit<InvestmentAgreement, 'id'> = {
      discussionRoomId: room.id,
      opportunityId: room.opportunityId,
      founderId: room.founderId,
      founderName: room.founderName,
      investorId: room.investorId,
      investorName: room.investorName,
      startupName: room.startupName,
      investmentAmount: room.investmentAmount,
      investorAllocation: room.investorAllocation,
      agreementDate: now(),
      founderAccepted: false,
      investorAccepted: false,
      status: 'agreement_pending',
    };
    const agreement = await firestoreAdapter.setWithId<Omit<InvestmentAgreement, 'id'>>('agreements', agreementId, payload);
    await recordTimeline({
      startupId: room.opportunityId,
      discussionRoomId: room.id,
      agreementId,
      actorId: currentUid() ?? room.founderId,
      eventType: 'agreement_signed',
      label: 'Agreement Created',
    });

    const roomAgreementPayload = {
      agreementId,
      status: 'agreement_pending',
    } as const;
    await firestoreAdapter.update<DiscussionRoom>('discussionRooms', room.id, roomAgreementPayload);

    return agreement;
  },

  async acceptAgreement(agreement: InvestmentAgreement, role: 'founder' | 'investor') {
    const founderAccepted = role === 'founder' ? true : agreement.founderAccepted;
    const investorAccepted = role === 'investor' ? true : agreement.investorAccepted;
    const status = founderAccepted && investorAccepted ? 'awaiting_funding' : agreement.status;

    const acceptPayload = {
      founderAccepted,
      investorAccepted,
      status,
    };
    const updated = await firestoreAdapter.update<InvestmentAgreement>('agreements', agreement.id, acceptPayload);

    const recipientId = role === 'founder' ? agreement.investorId : agreement.founderId;
    notificationService.createNotification({
      userId: recipientId,
      title: 'Agreement accepted',
      body: `${role === 'founder' ? agreement.founderName : agreement.investorName} accepted the agreement for ${agreement.startupName}.`,
      type: 'agreement_accepted',
      data: {
        agreementId: agreement.id,
      },
    }).catch((error) => console.info('[PromptFund Notifications] agreement notification failed', error));

    if (status === 'awaiting_funding') {
      await recordTimeline({
        startupId: agreement.opportunityId,
        discussionRoomId: agreement.discussionRoomId,
        agreementId: agreement.id,
        actorId: currentUid() ?? agreement.founderId,
        eventType: 'agreement_signed',
        label: 'Agreement Signed',
      });
      const fundingPayload = {
        status,
      };
      await firestoreAdapter.update<DiscussionRoom>('discussionRooms', agreement.discussionRoomId, fundingPayload);
    }

    return updated;
  },

  async createInterest({
    opportunity,
    investorId,
  }: {
    opportunity: InvestmentOpportunity;
    investorId: string;
  }) {
    const interestId = flowId('interest', opportunity.id, investorId);

    const interest = await firestoreAdapter.setWithId<Omit<StartupInterest, 'id'>>('interests', interestId, {
      interestId,
      startupOpportunityId: opportunity.id,
      founderId: opportunity.founderId,
      investorId,
      createdAt: now(),
      status: 'interested',
    });
    await recordTimeline({
      startupId: opportunity.id,
      actorId: investorId,
      eventType: 'interest_received',
      label: 'Interest Received',
    });
    notificationService.createNotification({
      userId: opportunity.founderId,
      title: 'New investor interest',
      body: `An Angel Investor showed interest in ${opportunity.startupName}.`,
      type: 'interest',
      data: { startupId: opportunity.id },
    }).catch((error) => console.info('[PromptFund Notifications] interest notification failed', error));
    await notifyAdmins('New interest', `${opportunity.startupName} received investor interest.`, 'interest', {
      startupId: opportunity.id,
    });
    return interest;
  },

  async createDiscussionRoomForInterest({
    interest,
    opportunity,
    investorName,
  }: {
    interest: StartupInterest;
    opportunity: InvestmentOpportunity;
    investorName: string;
  }) {
    const matchId = flowId('match', opportunity.id, interest.investorId);
    const match = await firestoreAdapter.setWithId<Omit<Match, 'id'>>('matches', matchId, {
      founderUid: opportunity.founderId,
      investorUid: interest.investorId,
      startupId: opportunity.id,
      matchedAt: now(),
      status: 'agreementStarted',
      agreementId: flowId('room', opportunity.id, interest.investorId),
    });
    await recordTimeline({
      startupId: opportunity.id,
      actorId: interest.investorId,
      eventType: 'match_created',
      label: 'Match Created',
      metadata: { matchId: match.id },
    });
    notificationService.createNotification({
      userId: interest.investorId,
      title: 'Founder accepted',
      body: `${opportunity.founderName} accepted your interest in ${opportunity.startupName}.`,
      type: 'match',
      data: { startupId: opportunity.id, matchId: match.id },
    }).catch((error) => console.info('[PromptFund Notifications] match notification failed', error));
    await notifyAdmins('Match created', `${opportunity.startupName} created a founder-investor match.`, 'match', {
      startupId: opportunity.id,
      matchId: match.id,
    });

    const room = await this.startDiscussion({
      opportunity,
      investorId: interest.investorId,
      investorName,
    });
    await recordTimeline({
      startupId: opportunity.id,
      discussionRoomId: room.id,
      actorId: interest.investorId,
      eventType: 'discussion_started',
      label: 'Discussion Started',
    });
    await notifyAdmins('Discussion started', `${opportunity.startupName} opened an Investment Discussion Room.`, 'discussion', {
      startupId: opportunity.id,
      discussionRoomId: room.id,
    });

    await firestoreAdapter.update<StartupInterest>('interests', interest.id, {
      status: 'discussion',
    });

    return room;
  },

  async createInterestMatchAndDiscussion({
    opportunity,
    investorId,
    investorName,
  }: {
    opportunity: InvestmentOpportunity;
    investorId: string;
    investorName: string;
  }) {
    const interest = await this.createInterest({
      opportunity,
      investorId,
    });

    const room = await this.createDiscussionRoomForInterest({
      interest,
      opportunity,
      investorName,
    });

    return { interest, room };
  },

  async listDiscussionRoomsByFounder(founderId: string): Promise<DiscussionRoom[]> {
    return firestoreAdapter.queryByField<DiscussionRoom>('discussionRooms', 'founderId', founderId);
  },

  async listDiscussionRoomsByInvestor(investorId: string): Promise<DiscussionRoom[]> {
    return firestoreAdapter.queryByField<DiscussionRoom>('discussionRooms', 'investorId', investorId);
  },

  async listMessagesByDiscussionRoom(discussionRoomId: string): Promise<DiscussionMessage[]> {
    const messages = await firestoreAdapter.queryByField<DiscussionMessage>('discussionMessages', 'discussionRoomId', discussionRoomId);
    return sortByCreatedAt(messages);
  },

  async listInterestsByFounder(founderUid: string): Promise<InvestmentInterest[]> {
    const interests = await firestoreAdapter.queryByField<StartupInterest>('interests', 'founderId', founderUid);
    return interests.map((interest) => ({
      id: interest.id,
      startupId: interest.startupOpportunityId,
      investorId: interest.investorId,
      founderUid: interest.founderId,
      createdAt: interest.createdAt,
      status: interest.status === 'discussion' ? 'accepted' : interest.status,
    }));
  },

  async listInterestsByInvestor(investorId: string): Promise<InvestmentInterest[]> {
    const interests = await firestoreAdapter.queryByField<StartupInterest>('interests', 'investorId', investorId);
    return interests.map((interest) => ({
      id: interest.id,
      startupId: interest.startupOpportunityId,
      investorId: interest.investorId,
      founderUid: interest.founderId,
      createdAt: interest.createdAt,
      status: interest.status === 'discussion' ? 'accepted' : interest.status,
    }));
  },

  async listMatchesByFounder(founderUid: string): Promise<Match[]> {
    return firestoreAdapter.queryByField<Match>('matches', 'founderUid', founderUid);
  },

  async listMatchesByInvestor(investorUid: string): Promise<Match[]> {
    return firestoreAdapter.queryByField<Match>('matches', 'investorUid', investorUid);
  },

  async acceptInterestAndCreateDiscussion({
    interest,
    opportunity,
    founderName,
    investorName,
  }: {
    interest: InvestmentInterest;
    opportunity: InvestmentOpportunity;
    founderName: string;
    investorName: string;
  }) {
    await firestoreAdapter.update<StartupInterest>('interests', interest.id, {
      status: 'accepted',
    });

    const match = await firestoreAdapter.create<Omit<Match, 'id'>>('matches', {
      founderUid: interest.founderUid,
      investorUid: interest.investorId,
      startupId: interest.startupId,
      matchedAt: now(),
      status: 'matched',
    });

    const room = await this.startDiscussion({
      opportunity: {
        ...opportunity,
        founderName,
      },
      investorId: interest.investorId,
      investorName,
    });

    await firestoreAdapter.update<Match>('matches', match.id, {
      agreementId: room.id,
      status: 'agreementStarted',
    });

    return { match, room };
  },

  async ensureDiscussionForMatch({
    match,
    opportunity,
    founderName,
    investorName,
  }: {
    match: Match;
    opportunity: InvestmentOpportunity;
    founderName: string;
    investorName: string;
  }) {
    if (match.agreementId) {
      const existingRoom = await this.getDiscussionRoom(match.agreementId);
      if (existingRoom) {
        return existingRoom;
      }
    }

    const room = await this.startDiscussion({
      opportunity: {
        ...opportunity,
        founderName,
      },
      investorId: match.investorUid,
      investorName,
    });

    await firestoreAdapter.update<Match>('matches', match.id, {
      agreementId: room.id,
      status: 'agreementStarted',
    });

    return room;
  },

  async markFundingArrangedOutsidePromptFund(agreement: InvestmentAgreement) {
    const arrangedAt = now();
    const fundingArrangedPayload = {
      status: 'funding_arranged',
      fundingArrangedAt: arrangedAt,
    } as const;

    logTractionFlowStep({
      step: 'confirm-arrangement-start',
      collection: 'agreements',
      documentId: agreement.id,
      data: {
        ...agreement,
        nextStatus: fundingArrangedPayload.status,
        fundingArrangedAt: arrangedAt,
      },
    });

    await writePortfolioInvestment(
      agreement,
      'funding_confirmed',
      {
        createdAt: arrangedAt,
        fundedAt: arrangedAt,
      },
      {
        agreementUpdate: fundingArrangedPayload,
        discussionRoomStatus: 'funding_arranged',
        opportunityStatus: 'funding_arranged',
      },
    );

    logTractionFlowStep({
      step: 'funding-confirmed-complete',
      collection: 'agreements',
      documentId: agreement.id,
      data: {
        status: 'funding_arranged',
        founderId: agreement.founderId,
        investorId: agreement.investorId,
        opportunityId: agreement.opportunityId,
        startupId: agreement.opportunityId,
        fundingArrangedAt: arrangedAt,
        investmentDocumentId: agreement.id,
      },
    });
    await recordTimeline({
      startupId: agreement.opportunityId,
      discussionRoomId: agreement.discussionRoomId,
      agreementId: agreement.id,
      actorId: currentUid() ?? agreement.investorId,
      eventType: 'funding_confirmed',
      label: 'Funding Confirmed',
    });
    await Promise.all([
      notificationService.createNotification({
        userId: agreement.founderId,
        title: 'Funding confirmed outside PromptFund',
        body: `${agreement.investorName} marked funding as arranged for ${agreement.startupName}. Continue in Traction.`,
        type: 'funding_confirmed',
        data: { agreementId: agreement.id, investmentId: agreement.id },
      }),
      notificationService.createNotification({
        userId: agreement.investorId,
        title: 'Funding confirmed outside PromptFund',
        body: `${agreement.startupName} is now in your Traction portfolio.`,
        type: 'funding_confirmed',
        data: { agreementId: agreement.id, investmentId: agreement.id },
      }),
    ]);
  },

  async recordFundingInstructionsOpened(agreement: InvestmentAgreement, actorId: string) {
    await recordTimeline({
      startupId: agreement.opportunityId,
      discussionRoomId: agreement.discussionRoomId,
      agreementId: agreement.id,
      actorId,
      eventType: 'funding_instructions_opened',
      label: 'Funding Instructions Opened',
    });
  },

  async acknowledgeFundingInstructions(agreement: InvestmentAgreement, actorId: string) {
    const acknowledgedAt = now();
    const updated = await firestoreAdapter.update<InvestmentAgreement>('agreements', agreement.id, {
      fundingInstructionsAcknowledgedAt: acknowledgedAt,
      updatedAt: acknowledgedAt,
    });
    await this.recordFundingInstructionsOpened(updated, actorId);
    return updated;
  },

  async confirmFundingArrangement(agreement: InvestmentAgreement) {
    return this.completeFundingAgreement(agreement);
  },

  async completeFundingAgreement(agreement: InvestmentAgreement) {
    const completedAt = now();

    logTractionFlowStep({
      step: 'confirm-arrangement-start',
      collection: 'agreements',
      documentId: agreement.id,
      data: {
        ...agreement,
        nextStatus: 'completed',
      },
    });

    const investment = await writePortfolioInvestment(
      agreement,
      'completed',
      {
        fundedAt: completedAt,
        createdAt: agreement.fundingArrangedAt ?? completedAt,
        completedAt,
      },
      {
        agreementUpdate: {
          status: 'completed',
          completedAt,
        },
        discussionRoomStatus: 'completed',
        opportunityStatus: 'completed',
      },
    );

    logTractionFlowStep({
      step: 'deal-completed',
      collection: 'investments',
      documentId: investment.id,
      data: investment,
    });
    await recordTimeline({
      startupId: agreement.opportunityId,
      discussionRoomId: agreement.discussionRoomId,
      agreementId: agreement.id,
      actorId: currentUid() ?? agreement.founderId,
      eventType: 'completed',
      label: 'Deal Completed',
    });

    await Promise.all([
      notificationService.createNotification({
        userId: agreement.investorId,
        title: 'Funding arrangement confirmed',
        body: `${agreement.founderName} confirmed completion for ${agreement.startupName}.`,
        type: 'funding_confirmed',
        data: { agreementId: agreement.id },
      }),
      notificationService.createNotification({
        userId: agreement.founderId,
        title: 'Funding agreement completed',
        body: `${agreement.startupName} moved to Traction as a portfolio company.`,
        type: 'funding_confirmed',
        data: { agreementId: agreement.id },
      }),
    ]);

    return investment;
  },

  async listInvestmentsByFounder(founderId: string): Promise<V5Investment[]> {
    const investments = await firestoreAdapter.queryByField<V5Investment>('investments', 'founderId', founderId);
    return investments.map(normalizeInvestment);
  },

  async listInvestmentsByInvestor(investorId: string): Promise<V5Investment[]> {
    const investments = await firestoreAdapter.queryByField<V5Investment>('investments', 'investorId', investorId);
    return investments.map(normalizeInvestment);
  },
};
