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

export type Investment = {
  id: string;
  investorId: string;
  projectId: string;
  amount: number;
  fundedAt: string;
  note: string;
};

export type Funding = Investment;

export type CreateInvestmentInput = Omit<Investment, 'id' | 'fundedAt'> & {
  fundedAt?: string;
};

export type CreateFundingInput = CreateInvestmentInput;

export type InvestmentInterestStatus = 'interested' | 'accepted' | 'passed' | 'expired';

export type InvestmentInterest = {
  id: string;
  startupId: string;
  investorId: string;
  founderUid: string;
  createdAt: string;
  status: InvestmentInterestStatus;
};

export type CreateInvestmentInterestInput = Omit<InvestmentInterest, 'id' | 'createdAt' | 'status'> & {
  status?: InvestmentInterestStatus;
  createdAt?: string;
};

export type MatchStatus = 'matched' | 'agreementStarted' | 'completed';

export type Match = {
  id: string;
  founderUid: string;
  investorUid: string;
  startupId: string;
  matchedAt: string;
  status: MatchStatus;
  agreementId?: string;
};

export type CreateMatchInput = Omit<Match, 'id' | 'matchedAt' | 'status'> & {
  status?: MatchStatus;
  matchedAt?: string;
};
