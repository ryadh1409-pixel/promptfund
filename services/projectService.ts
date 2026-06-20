import { projects } from '@/data/mockData';
import type { CreateProjectInput, Project, UpdateProjectInput } from '@/types/Project';

function createId(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const projectService = {
  async listProjects(): Promise<Project[]> {
    return projects;
  },

  async getProjectById(projectId: string): Promise<Project | null> {
    return projects.find((project) => project.id === projectId) ?? null;
  },

  async listProjectsByDeveloper(developerId: string): Promise<Project[]> {
    return projects.filter((project) => project.developerId === developerId);
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    return {
      ...input,
      id: createId(input.title),
      status: input.status ?? 'building',
      fundedAmount: 0,
      progress: 0,
    };
  },

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<Project | null> {
    const project = await this.getProjectById(projectId);

    if (!project) {
      return null;
    }

    return {
      ...project,
      ...input,
    };
  },
};
