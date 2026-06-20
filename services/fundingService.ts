import { firestoreAdapter } from '@/firebase/firestore';
import type {
  CreateInvestmentInput,
  CreateFundingRequestInput,
  Investment,
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

  async listInvestments(): Promise<Investment[]> {
    return firestoreAdapter.list<Investment>('investments');
  },

  async listInvestmentsByProject(projectId: string): Promise<Investment[]> {
    return firestoreAdapter.queryByField<Investment>('investments', 'projectId', projectId);
  },

  async createInvestment(input: CreateInvestmentInput): Promise<Investment> {
    return firestoreAdapter.create<Omit<Investment, 'id'>>('investments', {
      ...input,
      fundedAt: input.fundedAt ?? new Date().toISOString(),
    });
  },

  async listFundings(): Promise<Investment[]> {
    return this.listInvestments();
  },

  async listFundingsByProject(projectId: string): Promise<Investment[]> {
    return this.listInvestmentsByProject(projectId);
  },

  async createFunding(input: CreateInvestmentInput): Promise<Investment> {
    return this.createInvestment(input);
  },
};
