export type InvestmentFlowStatus =
  | 'open'
  | 'discussion_started'
  | 'ready_for_agreement'
  | 'agreement_pending'
  | 'awaiting_payment'
  | 'funded'
  | 'completed';

export type DiscussionMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export type InvestmentOpportunity = {
  id: string;
  startupName: string;
  founderId: string;
  founderName: string;
  fundingNeeded: number;
  investorAllocation: number;
  stage: string;
  purpose: string;
  shortDescription: string;
  imageUrl?: string;
  status: InvestmentFlowStatus;
  createdAt?: string;
};

export type DiscussionRoom = {
  id: string;
  opportunityId: string;
  founderId: string;
  founderName: string;
  investorId: string;
  investorName: string;
  startupName: string;
  investmentAmount: number;
  investorAllocation: number;
  founderReady: boolean;
  investorReady: boolean;
  messages: DiscussionMessage[];
  status: InvestmentFlowStatus;
  agreementId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type InvestmentAgreement = {
  id: string;
  discussionRoomId: string;
  opportunityId: string;
  founderId: string;
  founderName: string;
  investorId: string;
  investorName: string;
  startupName: string;
  investmentAmount: number;
  investorAllocation: number;
  agreementDate: string;
  founderAccepted: boolean;
  investorAccepted: boolean;
  status: InvestmentFlowStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type V5Investment = {
  id: string;
  agreementId?: string;
  discussionRoomId?: string;
  opportunityId?: string;
  projectId?: string;
  founderId?: string;
  founderName?: string;
  investorId: string;
  investorName?: string;
  startupName?: string;
  amount?: number;
  allocation?: number;
  status?: 'completed' | 'active';
  paymentStatus?: 'completed';
  transactionId?: string;
  paidAt?: string;
  fundedAt?: string;
  createdAt?: string;
  note?: string;
};

export type CreateInvestmentOpportunityInput = Omit<InvestmentOpportunity, 'id' | 'status'> & {
  status?: InvestmentFlowStatus;
};
