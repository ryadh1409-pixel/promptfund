import { firestoreAdapter } from '@/firebase/firestore';
import type { CreateProjectInput, Project, UpdateProjectInput } from '@/types/Project';

export const projectService = {
  async listProjects(): Promise<Project[]> {
    return firestoreAdapter.list<Project>('projects');
  },

  async getProjectById(projectId: string): Promise<Project | null> {
    return firestoreAdapter.getById<Project>('projects', projectId);
  },

  async listProjectsByDeveloper(developerId: string): Promise<Project[]> {
    return firestoreAdapter.queryByField<Project>('projects', 'developerId', developerId);
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    const project = await firestoreAdapter.create<Omit<Project, 'id'>>('projects', {
      ...input,
      status: input.status ?? 'building',
      fundedAmount: 0,
      progress: 0,
    });

    return project;
  },

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<Project | null> {
    return firestoreAdapter.update<Project>('projects', projectId, input);
  },
};
