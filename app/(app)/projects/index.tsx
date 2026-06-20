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
import { projects } from '@/data/mockData';
import { formatCurrency } from '@/utils/format';

export default function ProjectsScreen() {
  const isLoading = false;
  const totalGoal = projects.reduce((sum, project) => sum + project.goalAmount, 0);
  const totalFunded = projects.reduce((sum, project) => sum + project.fundedAmount, 0);

  return (
    <Screen
      eyebrow="PromptFund Projects"
      title="Portfolio of funded builds"
      subtitle="Review each developer project, funding goal, milestone proof, and tool budget from one investor-ready workspace."
    >
      <View style={ui.row}>
        <StatCard label="Pipeline" value={formatCurrency(totalGoal)} tone={colors.accent} />
        <StatCard label="Committed" value={formatCurrency(totalFunded)} tone={colors.success} />
      </View>

      <SectionTitle
        title="Active portfolio"
        action={<PrimaryLink href="/projects/create" label="New project" variant="secondary" />}
      />

      {isLoading ? <LoadingState label="Loading PromptFund projects" /> : null}

      {!isLoading && projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          message="Create a PromptFund project to give investors a clear funding goal, tool list, and milestone trail."
          action={<PrimaryLink href="/projects/create" label="Create first project" />}
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
