import { firestoreAdapter } from '@/firebase/firestore';
import type {
  CreateInvestmentOpportunityInput,
  DiscussionMessage,
  DiscussionRoom,
  InvestmentAgreement,
  InvestmentOpportunity,
  V5Investment,
} from '@/types/InvestmentFlow';
import type { Project } from '@/types/Project';
import type { User } from '@/types/User';

export const defaultInvestmentAmount = 22;
export const defaultInvestorAllocation = 1;
export const defaultStartupStage = 'MVP';
export const defaultInvestmentPurpose = 'Fund one month of AI development tools and product growth.';

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
    status: 'open',
  };
}

export const investmentFlowService = {
  async listOpportunities(): Promise<InvestmentOpportunity[]> {
    return firestoreAdapter.list<InvestmentOpportunity>('investmentOpportunities');
  },

  async getOpportunity(opportunityId: string): Promise<InvestmentOpportunity | null> {
    return firestoreAdapter.getById<InvestmentOpportunity>('investmentOpportunities', opportunityId);
  },

  async createOpportunity(input: CreateInvestmentOpportunityInput): Promise<InvestmentOpportunity> {
    return firestoreAdapter.create<Omit<InvestmentOpportunity, 'id'>>('investmentOpportunities', {
      ...input,
      status: input.status ?? 'open',
    });
  },

  async ensureOpportunityFromProject(project: Project): Promise<InvestmentOpportunity> {
    const existing = await this.getOpportunity(project.id);
    if (existing) {
      return existing;
    }

    const opportunity = mapProjectToOpportunity(project);
    return firestoreAdapter.setWithId<Omit<InvestmentOpportunity, 'id'>>('investmentOpportunities', project.id, {
      ...opportunity,
      status: 'open',
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
    const room = await firestoreAdapter.create<Omit<DiscussionRoom, 'id'>>('discussionRooms', {
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
      status: 'discussion_started',
    });

    await firestoreAdapter.update<InvestmentOpportunity>('investmentOpportunities', opportunity.id, {
      status: 'discussion_started',
    });

    return room;
  },

  async addDiscussionMessage(room: DiscussionRoom, sender: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle'>, body: string) {
    const message: DiscussionMessage = {
      id: `message-${Date.now()}`,
      senderId: sender.id,
      senderName: displayName(sender),
      body,
      createdAt: now(),
    };

    return firestoreAdapter.update<DiscussionRoom>('discussionRooms', room.id, {
      messages: [...(room.messages ?? []), message],
    });
  },

  async setReady(room: DiscussionRoom, role: 'founder' | 'investor') {
    const founderReady = role === 'founder' ? true : room.founderReady;
    const investorReady = role === 'investor' ? true : room.investorReady;
    const status = founderReady && investorReady ? 'ready_for_agreement' : room.status;

    return firestoreAdapter.update<DiscussionRoom>('discussionRooms', room.id, {
      founderReady,
      investorReady,
      status,
    });
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
    const status = founderAccepted && investorAccepted ? 'awaiting_payment' : agreement.status;

    const updated = await firestoreAdapter.update<InvestmentAgreement>('agreements', agreement.id, {
      founderAccepted,
      investorAccepted,
      status,
    });

    if (status === 'awaiting_payment') {
      await firestoreAdapter.update<DiscussionRoom>('discussionRooms', agreement.discussionRoomId, {
        status,
      });
    }

    return updated;
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
      firestoreAdapter.update<InvestmentOpportunity>('investmentOpportunities', agreement.opportunityId, {
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
