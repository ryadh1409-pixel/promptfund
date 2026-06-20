export type UserRole = 'developer' | 'investor';

export type User = {
  id: string;
  name: string;
  handle: string;
  role: UserRole;
  avatar: string;
  bio: string;
  location: string;
  stack: string[];
  trustScore: number;
};

export type ProjectStatus = 'building' | 'funding' | 'shipped';

export type Project = {
  id: string;
  developerId: string;
  title: string;
  tagline: string;
  description: string;
  status: ProjectStatus;
  goalAmount: number;
  fundedAmount: number;
  progress: number;
  tools: string[];
  milestones: string[];
  nextUpdate: string;
};

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

export type Funding = {
  id: string;
  investorId: string;
  projectId: string;
  amount: number;
  fundedAt: string;
  note: string;
};

export type ExpenseStatus = 'pending' | 'approved';

export type Expense = {
  id: string;
  projectId: string;
  title: string;
  vendor: string;
  amount: number;
  category: string;
  date: string;
  status: ExpenseStatus;
};

export type FundPoints = {
  id: string;
  userId: string;
  balance: number;
  lifetimeEarned: number;
  streakWeeks: number;
  history: Array<{
    id: string;
    label: string;
    points: number;
    date: string;
  }>;
};
