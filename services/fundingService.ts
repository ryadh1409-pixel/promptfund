import { firestoreAdapter } from '@/firebase/firestore';
import type {
  CreateInvestmentInput,
  CreateFundingRequestInput,
  CreateInvestmentInterestInput,
  CreateMatchInput,
  Investment,
  InvestmentInterest,
  Match,
  FundingRequest,
  UpdateFundingRequestInput,
} from '@/types/FundingRequest';

export const fundingService = {
  async listFundingRequests(): Promise<FundingRequest[]> {
    return firestoreAdapter.list<FundingRequest>('fundingRequests');
  },

  async getFundingRequestById(requestId: string): Promise<FundingRequest | null> {
    return firestoreAdapter.getById<FundingRequest>('fundingRequests', requestId);
  },

  async listFundingRequestsByProject(projectId: string): Promise<FundingRequest[]> {
    return firestoreAdapter.queryByField<FundingRequest>('fundingRequests', 'projectId', projectId);
  },

  async createFundingRequest(input: CreateFundingRequestInput): Promise<FundingRequest> {
    return firestoreAdapter.create<Omit<FundingRequest, 'id'>>('fundingRequests', {
      ...input,
      status: input.status ?? 'open',
    });
  },

  async updateFundingRequest(
    requestId: string,
    input: UpdateFundingRequestInput,
  ): Promise<FundingRequest | null> {
    return firestoreAdapter.update<FundingRequest>('fundingRequests', requestId, input);
  },

  async listInvestmentsByProject(projectId: string): Promise<Investment[]> {
    return firestoreAdapter.queryByField<Investment>('investments', 'projectId', projectId);
  },

  async listInvestmentsByInvestor(investorId: string): Promise<Investment[]> {
    return firestoreAdapter.queryByField<Investment>('investments', 'investorId', investorId);
  },

  async createInvestment(input: CreateInvestmentInput): Promise<Investment> {
    return firestoreAdapter.create<Omit<Investment, 'id'>>('investments', {
      ...input,
      fundedAt: input.fundedAt ?? new Date().toISOString(),
    });
  },

  async createInvestmentInterest(input: CreateInvestmentInterestInput): Promise<InvestmentInterest> {
    return firestoreAdapter.create<Omit<InvestmentInterest, 'id'>>('investmentInterests', {
      ...input,
      createdAt: input.createdAt ?? new Date().toISOString(),
      status: input.status ?? 'interested',
    });
  },

  async listInterestsByFounder(founderUid: string): Promise<InvestmentInterest[]> {
    return firestoreAdapter.queryByField<InvestmentInterest>('investmentInterests', 'founderUid', founderUid);
  },

  async listInterestsByInvestor(investorId: string): Promise<InvestmentInterest[]> {
    return firestoreAdapter.queryByField<InvestmentInterest>('investmentInterests', 'investorId', investorId);
  },

  async acceptInvestmentInterest(interest: InvestmentInterest): Promise<Match> {
    await firestoreAdapter.update<InvestmentInterest>('investmentInterests', interest.id, {
      status: 'accepted',
    });

    return firestoreAdapter.create<Omit<Match, 'id'>>('matches', {
      founderUid: interest.founderUid,
      investorUid: interest.investorId,
      startupId: interest.startupId,
      matchedAt: new Date().toISOString(),
      status: 'matched',
    });
  },

  async createMatch(input: CreateMatchInput): Promise<Match> {
    return firestoreAdapter.create<Omit<Match, 'id'>>('matches', {
      ...input,
      matchedAt: input.matchedAt ?? new Date().toISOString(),
      status: input.status ?? 'matched',
    });
  },

  async updateMatch(matchId: string, input: Partial<Match>): Promise<Match> {
    return firestoreAdapter.update<Match>('matches', matchId, input);
  },

  async listMatchesByInvestor(investorUid: string): Promise<Match[]> {
    return firestoreAdapter.queryByField<Match>('matches', 'investorUid', investorUid);
  },

  async listMatchesByFounder(founderUid: string): Promise<Match[]> {
    return firestoreAdapter.queryByField<Match>('matches', 'founderUid', founderUid);
  },

  async listFundingsByProject(projectId: string): Promise<Investment[]> {
    return this.listInvestmentsByProject(projectId);
  },

  async createFunding(input: CreateInvestmentInput): Promise<Investment> {
    return this.createInvestment(input);
  },
};
