export type ProjectStatus = 'building' | 'funding' | 'shipped';

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
};

export type CreateProjectInput = Omit<Project, 'id' | 'fundedAmount' | 'progress' | 'status'> & {
  status?: ProjectStatus;
};

export type UpdateProjectInput = Partial<Omit<Project, 'id' | 'developerId' | 'ownerId'>>;
