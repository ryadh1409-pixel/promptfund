export type PortfolioStage =
  | 'funded'
  | 'traction_updates'
  | 'testflight_ready'
  | 'production_ready'
  | 'growing_portfolio_company';

export type FounderUpdateKind =
  | 'product'
  | 'milestone'
  | 'revenue'
  | 'hiring'
  | 'funding'
  | 'testflight'
  | 'general';

export type FounderUpdate = {
  id: string;
  investmentId: string;
  opportunityId?: string;
  discussionRoomId?: string;
  founderId: string;
  founderName: string;
  investorId: string;
  startupName: string;
  description: string;
  kind: FounderUpdateKind;
  photoUrls?: string[];
  screenshotUrls?: string[];
  videoLink?: string;
  testFlightLink?: string;
  appStoreLink?: string;
  website?: string;
  demoLink?: string;
  revenue?: number;
  arr?: number;
  mrr?: number;
  users?: number;
  downloads?: number;
  milestones?: string;
  productUpdates?: string;
  hiringUpdates?: string;
  newFundingRounds?: string;
  likeCount?: number;
  commentCount?: number;
  likedBy?: Record<string, boolean>;
  createdAt: string;
  updatedAt?: string;
};

export type FounderUpdateComment = {
  id: string;
  updateId: string;
  investmentId: string;
  parentCommentId?: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
};

export type AiUsageAnalytics = {
  id: string;
  investmentId: string;
  founderId: string;
  investorId: string;
  totalTokens: number;
  tokensThisMonth: number;
  tokensToday: number;
  aiConversations: number;
  lastAiActivity?: string;
  updatedAt?: string;
};

export type PortfolioMilestoneState = {
  stage: PortfolioStage;
  stageNumber: 5 | 6 | 7 | 8;
  label: string;
  testFlightAvailable?: boolean;
  testFlightAvailableAt?: string;
  testFlightTested?: boolean;
  testFlightTestedAt?: string;
  needsChanges?: boolean;
  needsChangesAt?: string;
  lastUpdateAt?: string;
};
