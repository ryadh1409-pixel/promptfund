import { firestoreAdapter } from '@/firebase/firestore';
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
import type { User } from '@/types/User';

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

function normalizeInvestment(investment: V5Investment): V5Investment {
  return {
    status: 'active',
    ...investment,
    allocation: investment.allocation ?? 0,
  };
}

function sortByCreatedAt<T extends { createdAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? '')));
}

function flowId(prefix: string, ...parts: string[]) {
  return `${prefix}-${parts.join('-')}`.replace(/[^A-Za-z0-9_-]/g, '-');
}

export function mapProjectToOpportunity(project: Project): InvestmentOpportunity {
  return {
    id: project.id,
    startupName: project.startupName ?? project.title ?? 'Startup',
    founderId: project.ownerId ?? project.founderId ?? project.developerId,
    founderName: project.founderName ?? 'Founder',
    fundingNeeded: project.goalAmount && project.goalAmount > 0 ? project.goalAmount : defaultInvestmentAmount,
    investorAllocation: project.equityOffered ?? defaultInvestorAllocation,
    stage: project.stage ?? defaultStartupStage,
    purpose: project.description || defaultInvestmentPurpose,
    shortDescription: project.description || defaultInvestmentPurpose,
    imageUrl: project.imageUrl ?? project.coverImage,
    status: 'active',
  };
}

export const investmentFlowService = {
  async listOpportunities(): Promise<InvestmentOpportunity[]> {
    return firestoreAdapter.list<InvestmentOpportunity>('startupOpportunities');
  },

  async getOpportunity(opportunityId: string): Promise<InvestmentOpportunity | null> {
    return firestoreAdapter.getById<InvestmentOpportunity>('startupOpportunities', opportunityId);
  },

  async listOpportunitiesByFounder(founderId: string): Promise<InvestmentOpportunity[]> {
    return firestoreAdapter.queryByField<InvestmentOpportunity>('startupOpportunities', 'founderId', founderId);
  },

  async createOpportunity(input: CreateInvestmentOpportunityInput): Promise<InvestmentOpportunity> {
    return firestoreAdapter.create<Omit<InvestmentOpportunity, 'id'>>('startupOpportunities', {
      ...input,
      status: input.status ?? 'active',
    });
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
    await firestoreAdapter.setWithId<Omit<InvestmentOpportunity, 'id'>>('startupOpportunities', opportunity.id, {
      ...opportunity,
      status: 'discussion_started',
    });

    const roomId = flowId('room', opportunity.id, investorId);
    console.log(`discussionRooms/${roomId}`);
    console.log('ROOM CREATE START');
    console.log('CREATE ROOM START');
    const room = await firestoreAdapter.setWithId<DiscussionRoom>('discussionRooms', roomId, {
      id: roomId,
      roomId,
      startupOpportunityId: opportunity.id,
      opportunityId: opportunity.id,
      founderId: opportunity.founderId,
      founderName: opportunity.founderName,
      investorId,
      investorName,
      startupName: opportunity.startupName,
      investmentAmount: opportunity.fundingNeeded,
      investorAllocation: opportunity.investorAllocation,
      founderReady: false,
      investorReady: false,
      messages: [],
      status: 'active',
    });
    console.log('ROOM CREATE SUCCESS', roomId);
    console.log('CREATE ROOM SUCCESS', roomId);
    console.log('READ ROOM START', roomId);
    let createdRoom: DiscussionRoom | null = null;
    try {
      createdRoom = await this.getDiscussionRoom(roomId);
      console.log('READ ROOM SUCCESS');
    } catch (error) {
      console.error('READ ROOM FAILURE AFTER CREATE', { roomId, error });
    }

    return createdRoom ?? room;
  },

  async addDiscussionMessage(room: DiscussionRoom, sender: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle'>, body: string) {
    const message: DiscussionMessage = {
      id: `message-${Date.now()}`,
      discussionRoomId: room.id,
      senderId: sender.id,
      senderName: displayName(sender),
      body,
      createdAt: now(),
    };

    await firestoreAdapter.create<Omit<DiscussionMessage, 'id'>>('discussionMessages', {
      discussionRoomId: room.id,
      senderId: message.senderId,
      senderName: message.senderName,
      body: message.body,
      createdAt: message.createdAt,
    });

    return firestoreAdapter.update<DiscussionRoom>('discussionRooms', room.id, {
      messages: [...(room.messages ?? []), message],
    });
  },

  async setReady(room: DiscussionRoom, role: 'founder' | 'investor') {
    const founderReady = role === 'founder' ? true : room.founderReady;
    const investorReady = role === 'investor' ? true : room.investorReady;
    const status = founderReady && investorReady ? 'ready' : room.status;

    const updatedRoom = await firestoreAdapter.update<DiscussionRoom>('discussionRooms', room.id, {
      founderReady,
      investorReady,
      status,
    });

    if (status === 'ready') {
      const agreement = await this.generateAgreement(updatedRoom);
      return firestoreAdapter.update<DiscussionRoom>('discussionRooms', room.id, {
        agreementId: agreement.id,
        status: 'ready',
      });
    }

    return updatedRoom;
  },

  async getAgreement(agreementId: string): Promise<InvestmentAgreement | null> {
    return firestoreAdapter.getById<InvestmentAgreement>('agreements', agreementId);
  },

  async generateAgreement(room: DiscussionRoom) {
    const agreementId = `agreement-${room.id}`;
    const existing = await this.getAgreement(agreementId);
    if (existing) {
      return existing;
    }

    const agreement = await firestoreAdapter.setWithId<Omit<InvestmentAgreement, 'id'>>('agreements', agreementId, {
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
    });

    await firestoreAdapter.update<DiscussionRoom>('discussionRooms', room.id, {
      agreementId,
      status: 'agreement_pending',
    });

    return agreement;
  },

  async acceptAgreement(agreement: InvestmentAgreement, role: 'founder' | 'investor') {
    const founderAccepted = role === 'founder' ? true : agreement.founderAccepted;
    const investorAccepted = role === 'investor' ? true : agreement.investorAccepted;
    const status = founderAccepted && investorAccepted ? 'awaiting_funding' : agreement.status;

    const updated = await firestoreAdapter.update<InvestmentAgreement>('agreements', agreement.id, {
      founderAccepted,
      investorAccepted,
      status,
    });

    if (status === 'awaiting_funding') {
      await firestoreAdapter.update<DiscussionRoom>('discussionRooms', agreement.discussionRoomId, {
        status,
      });
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

    return firestoreAdapter.setWithId<Omit<StartupInterest, 'id'>>('interests', interestId, {
      interestId,
      startupOpportunityId: opportunity.id,
      founderId: opportunity.founderId,
      investorId,
      createdAt: now(),
      status: 'interested',
    });
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
    console.log('STEP 3A: Match created', match.id);

    console.log('STEP 3B: Creating discussion room');
    const room = await this.startDiscussion({
      opportunity,
      investorId: interest.investorId,
      investorName,
    });
    console.log('STEP 4: Discussion room created', room.id);

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
    await firestoreAdapter.update<InvestmentInterest>('investmentInterests', interest.id, {
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

  async completePayment(agreement: InvestmentAgreement) {
    const paidAt = now();
    const transactionId = `pf_${Date.now()}`;
    const investment = await firestoreAdapter.setWithId<Omit<V5Investment, 'id'>>('investments', agreement.id, {
      agreementId: agreement.id,
      discussionRoomId: agreement.discussionRoomId,
      opportunityId: agreement.opportunityId,
      founderId: agreement.founderId,
      founderName: agreement.founderName,
      investorId: agreement.investorId,
      investorName: agreement.investorName,
      startupName: agreement.startupName,
      amount: agreement.investmentAmount,
      allocation: agreement.investorAllocation,
      status: 'active',
      paymentStatus: 'completed',
      transactionId,
      paidAt,
    });

    await Promise.all([
      firestoreAdapter.update<InvestmentAgreement>('agreements', agreement.id, {
        status: 'funded',
      }),
      firestoreAdapter.update<DiscussionRoom>('discussionRooms', agreement.discussionRoomId, {
        status: 'funded',
      }),
      firestoreAdapter.update<InvestmentOpportunity>('startupOpportunities', agreement.opportunityId, {
        status: 'funded',
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
