import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import {
  Card,
  LoadingState,
  Pill,
  PrimaryLink,
  ProgressBar,
  Screen,
  SectionTitle,
  StatCard,
  ui,
} from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { firestoreAdapter } from '@/firebase/firestore';
import { fundingService } from '@/services/fundingService';
import { projectService } from '@/services/projectService';
import type { Expense } from '@/types/Expense';
import type { Investment, FundingRequest } from '@/types/FundingRequest';
import type { Project } from '@/types/Project';
import { formatCurrency, formatPercent } from '@/utils/format';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [projectExpenses, setProjectExpenses] = useState<Expense[]>([]);
  const [projectInvestments, setProjectInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const request = requests[0];

  useEffect(() => {
    async function loadProjectDetails() {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [nextProject, nextRequests, nextExpenses, nextInvestments] = await Promise.all([
          projectService.getProjectById(id),
          fundingService.listFundingRequestsByProject(id),
          firestoreAdapter.queryByField<Expense>('expenses', 'projectId', id),
          fundingService.listInvestmentsByProject(id),
        ]);

        setProject(nextProject);
        setRequests(nextRequests);
        setProjectExpenses(nextExpenses);
        setProjectInvestments(nextInvestments);
      } finally {
        setIsLoading(false);
      }
    }

    loadProjectDetails();
  }, [id]);

  if (isLoading) {
    return (
      <Screen eyebrow="Project Details" title="Loading project" subtitle="Loading this PromptFund project from Firestore.">
        <LoadingState label="Loading project details" />
      </Screen>
    );
  }

  if (!project) {
    return (
      <Screen eyebrow="Project Details" title="Project not found" subtitle="This PromptFund project is not available in Firestore.">
        <PrimaryLink href="/projects" label="Back to projects" />
      </Screen>
    );
  }

  return (
    <Screen eyebrow="Project Details" title={project.title} subtitle={project.description}>
      <View style={ui.wrap}>
        <Pill label={project.status} tone={colors.primary} />
        {project.tools.map((tool) => (
          <Pill key={tool} label={tool} />
        ))}
      </View>

      <Card>
        <ProgressBar progress={project.progress} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
          {formatCurrency(project.fundedAmount)} funded of {formatCurrency(project.goalAmount)}
        </Text>
        <Text style={{ color: colors.muted }}>{formatPercent(project.progress)} of tool budget secured</Text>
      </Card>

      <View style={ui.row}>
        <StatCard label="Investments" value={String(projectInvestments.length)} />
        <StatCard label="Expenses" value={String(projectExpenses.length)} tone={colors.warning} />
      </View>

      <SectionTitle title="Milestones" />
      <Card>
        {project.milestones.map((milestone, index) => (
          <Text key={milestone} style={{ color: colors.text }}>
            {index + 1}. {milestone}
          </Text>
        ))}
        <Text style={{ color: colors.accent, fontWeight: '800' }}>{project.nextUpdate}</Text>
      </Card>

      {request ? (
        <>
          <SectionTitle title="Current funding request" />
          <Card>
            <Pill label={request.status} tone="rgba(34, 211, 238, 0.18)" />
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
              {formatCurrency(request.amount)} for {request.tool}
            </Text>
            <Text style={{ color: colors.muted, lineHeight: 21 }}>{request.reason}</Text>
            <PrimaryLink href="/funding/request" label="Open request form" variant="secondary" />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
