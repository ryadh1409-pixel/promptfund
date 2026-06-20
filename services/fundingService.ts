import { fundingRequests, fundings } from '@/data/mockData';
import type {
  CreateFundingInput,
  CreateFundingRequestInput,
  Funding,
  FundingRequest,
  UpdateFundingRequestInput,
} from '@/types/FundingRequest';

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export const fundingService = {
  async listFundingRequests(): Promise<FundingRequest[]> {
    return fundingRequests;
  },

  async getFundingRequestById(requestId: string): Promise<FundingRequest | null> {
    return fundingRequests.find((request) => request.id === requestId) ?? null;
  },

  async listFundingRequestsByProject(projectId: string): Promise<FundingRequest[]> {
    return fundingRequests.filter((request) => request.projectId === projectId);
  },

  async createFundingRequest(input: CreateFundingRequestInput): Promise<FundingRequest> {
    return {
      ...input,
      id: createId('fr'),
      status: input.status ?? 'open',
    };
  },

  async updateFundingRequest(
    requestId: string,
    input: UpdateFundingRequestInput,
  ): Promise<FundingRequest | null> {
    const request = await this.getFundingRequestById(requestId);

    if (!request) {
      return null;
    }

    return {
      ...request,
      ...input,
    };
  },

  async listFundings(): Promise<Funding[]> {
    return fundings;
  },

  async listFundingsByProject(projectId: string): Promise<Funding[]> {
    return fundings.filter((funding) => funding.projectId === projectId);
  },

  async createFunding(input: CreateFundingInput): Promise<Funding> {
    return {
      ...input,
      id: createId('funding'),
      fundedAt: input.fundedAt ?? new Date().toISOString(),
    };
  },
};
