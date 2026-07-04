export type InvestmentFlowStatus =
  | 'active'
  | 'open'
  | 'discussion'
  | 'discussion_started'
  | 'ready'
  | 'agreement_pending'
  | 'awaiting_funding'
  | 'funding_arranged'
  | 'funded'
  | 'completed'
  | 'archived'
  | 'frozen'
  | 'suspended'
  | 'deleted';

export type DiscussionMessage = {
  id: string;
  discussionRoomId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  type?: 'user' | 'system';
  status?: 'sent' | 'delivered' | 'read';
  imageUrl?: string;
  documentUrl?: string;
  documentName?: string;
  linkUrl?: string;
  deliveredTo?: string[];
  readBy?: string[];
  moderationFlags?: string[];
};

export type InvestmentOpportunity = {
  id: string;
  title?: string;
  startupName: string;
  founderId: string;
  founderName: string;
  description?: string;
  fundingGoal?: number;
  askAmount?: number;
  equity?: number;
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
  roomId: string;
  startupOpportunityId: string;
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
  founderTestFlightReady?: boolean;
  investorTestFlightReady?: boolean;
  messages: DiscussionMessage[];
  status: InvestmentFlowStatus;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  typingBy?: Record<string, boolean>;
  readReceipts?: Record<string, string>;
  unreadCounts?: Record<string, number>;
  mutedBy?: Record<string, boolean>;
  leftBy?: Record<string, boolean>;
  agreementId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type StartupInterest = {
  id: string;
  interestId: string;
  startupOpportunityId: string;
  founderId: string;
  investorId: string;
  status: 'interested' | 'discussion' | 'accepted' | 'expired';
  createdAt: string;
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
  fundingArrangedAt?: string;
  completedAt?: string;
  investorSentAt?: string;
  fundedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TractionPortfolioStatus = 'funding_confirmed' | 'active' | 'completed';

export type V5Investment = {
  id: string;
  agreementId?: string;
  discussionRoomId?: string;
  opportunityId?: string;
  startupId?: string;
  startupImage?: string;
  projectId?: string;
  founderId?: string;
  founderName?: string;
  investorId: string;
  investorName?: string;
  startupName?: string;
  amount?: number;
  fundedAmount?: number;
  allocation?: number;
  status?: TractionPortfolioStatus | 'archived';
  isTraction?: boolean;
  isPortfolio?: boolean;
  fundingConfirmedAt?: string;
  completedAt?: string;
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
