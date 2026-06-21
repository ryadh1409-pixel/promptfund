export type ProjectStatus = 'building' | 'funding' | 'shipped';
export type StartupCardRank = 'A' | 'K' | 'Q' | 'J';

export type Project = {
  id: string;
  developerId: string;
  ownerId: string;
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
  coverImage?: string;
  logoUrl?: string;
  equityOffered?: number;
  metric?: string;
  founderName?: string;
  founderPhotoURL?: string;
  founderAvatar?: string;
  founderVerified?: boolean;
  rank?: StartupCardRank;
  industry?: string;
  location?: string;
  raisedSoFar?: number;
  valuation?: number;
  stage?: string;
  traction?: string;
  monthlyRevenue?: number;
  growthPercent?: number;
  riskRating?: 'Low' | 'Medium' | 'High';
  shortPitch?: string;
};

export type CreateProjectInput = Omit<Project, 'id' | 'fundedAmount' | 'progress' | 'status'> & {
  status?: ProjectStatus;
};

export type UpdateProjectInput = Partial<Omit<Project, 'id' | 'developerId' | 'ownerId'>>;
