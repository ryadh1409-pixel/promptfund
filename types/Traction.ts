export type FounderUpdateKind =
  | 'product'
  | 'milestone'
  | 'revenue'
  | 'hiring'
  | 'funding'
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
  founderId: string;
  investorId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
};

