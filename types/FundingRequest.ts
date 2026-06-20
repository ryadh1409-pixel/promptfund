export type FundingRequestStatus = 'open' | 'partiallyFunded' | 'funded';

export type FundingRequest = {
  id: string;
  projectId: string;
  requestedBy: string;
  amount: number;
  tool: string;
  reason: string;
  status: FundingRequestStatus;
  dueDate: string;
};

export type CreateFundingRequestInput = Omit<FundingRequest, 'id' | 'status'> & {
  status?: FundingRequestStatus;
};

export type UpdateFundingRequestInput = Partial<Omit<FundingRequest, 'id' | 'projectId' | 'requestedBy'>>;

export type Funding = {
  id: string;
  investorId: string;
  projectId: string;
  amount: number;
  fundedAt: string;
  note: string;
};

export type CreateFundingInput = Omit<Funding, 'id' | 'fundedAt'> & {
  fundedAt?: string;
};
