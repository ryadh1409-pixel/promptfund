import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { ProjectCard } from '@/components/project/ProjectCard';
import {
  EmptyState,
  LoadingState,
  PrimaryLink,
  Screen,
  SectionTitle,
  StatCard,
  ui,
} from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { projectService } from '@/services/projectService';
import type { Project } from '@/types/Project';
import { formatCurrency } from '@/utils/format';
import { isEntrepreneurRole } from '@/utils/roles';

export default function ProjectsScreen() {
  const { authUser, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isEntrepreneur = isEntrepreneurRole(profile?.role);
  const totalGoal = projects.reduce((sum, project) => sum + project.goalAmount, 0);
  const totalFunded = projects.reduce((sum, project) => sum + project.fundedAmount, 0);

  useEffect(() => {
    async function loadProjects() {
      setIsLoading(true);

      try {
        setProjects(
          isEntrepreneur && authUser
            ? await projectService.listProjectsByDeveloper(authUser.uid)
            : await projectService.listProjects(),
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadProjects();
  }, [authUser, isEntrepreneur]);

  return (
    <Screen
      eyebrow="PromptFund Projects"
      title={isEntrepreneur ? 'Funding Progress' : 'Portfolio of funded builds'}
      subtitle={
        isEntrepreneur
          ? 'Track your startup card, investor matches, and capital progress.'
          : 'Review each startup, funding goal, milestone proof, and tool budget from one investor-ready workspace.'
      }
    >
      <View style={ui.row}>
        <StatCard label={isEntrepreneur ? 'Target raise' : 'Pipeline'} value={formatCurrency(totalGoal)} tone={colors.accent} />
        <StatCard label={isEntrepreneur ? 'Raised so far' : 'Committed'} value={formatCurrency(totalFunded)} tone={colors.success} />
      </View>

      <SectionTitle
        title={isEntrepreneur ? 'My Startup' : 'Active portfolio'}
        action={<PrimaryLink href="/projects/create" label={isEntrepreneur ? 'Edit card' : 'New project'} variant="secondary" />}
      />

      {isLoading ? <LoadingState label="Loading PromptFund projects" /> : null}

      {!isLoading && projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          message={isEntrepreneur ? 'Create your startup card to start receiving investor interest.' : 'Create a PromptFund project to give investors a clear funding goal, tool list, and milestone trail.'}
          action={<PrimaryLink href="/projects/create" label={isEntrepreneur ? 'Create My Startup' : 'Create first project'} />}
        />
      ) : null}

      {!isLoading && projects.length > 0 ? (
        <>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          <Text style={{ color: colors.muted, lineHeight: 21 }}>
            PromptFund ranks projects by funding clarity, expense transparency, and recent progress.
          </Text>
        </>
      ) : null}
    </Screen>
  );
}
