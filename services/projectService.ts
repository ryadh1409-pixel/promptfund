import { firestoreAdapter } from '@/firebase/firestore';
import type { CreateProjectInput, CreateStartupCardInput, Project, UpdateProjectInput } from '@/types/Project';

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

  async listStartupCardsByFounder(founderId: string): Promise<Project[]> {
    return firestoreAdapter.queryByField<Project>('projects', 'founderId', founderId);
  },

  async listProjectsByOwner(ownerId: string): Promise<Project[]> {
    return firestoreAdapter.queryByField<Project>('projects', 'ownerId', ownerId);
  },

  async listProjectsForFounder(founderId: string): Promise<Project[]> {
    const [legacyProjects, startupCards, ownerProjects] = await Promise.all([
      this.listProjectsByDeveloper(founderId),
      this.listStartupCardsByFounder(founderId),
      this.listProjectsByOwner(founderId),
    ]);
    const projectsById = new Map(
      [...legacyProjects, ...startupCards, ...ownerProjects].map((project) => [project.id, project]),
    );

    return Array.from(projectsById.values());
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

  async createStartupCard(input: CreateStartupCardInput): Promise<Project> {
    const startupCard = await firestoreAdapter.create<CreateStartupCardInput>('projects', input);

    return {
      ...startupCard,
      developerId: input.founderId,
      ownerId: input.founderId,
      founderId: input.founderId,
      startupName: input.startupName,
      title: input.startupName,
      tagline: input.description,
      description: input.description,
      imageUrl: input.imageUrl,
      coverImage: input.imageUrl,
      status: 'funding',
      goalAmount: 0,
      fundedAmount: 0,
      progress: 0,
      tools: ['Startup Card'],
      milestones: [],
      nextUpdate: 'Startup card published',
    };
  },

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<Project | null> {
    return firestoreAdapter.update<Project>('projects', projectId, input);
  },
};
