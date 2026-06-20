import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import {
  Card,
  Pill,
  PrimaryLink,
  ProgressBar,
  Screen,
  SectionTitle,
  StatCard,
  ui,
} from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { expenses, fundingRequests, fundings, projects } from '@/data/mockData';
import { formatCurrency, formatPercent } from '@/utils/format';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = projects.find((item) => item.id === id) ?? projects[0];
  const request = fundingRequests.find((item) => item.projectId === project.id);
  const projectExpenses = expenses.filter((expense) => expense.projectId === project.id);
  const projectFundings = fundings.filter((funding) => funding.projectId === project.id);

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
        <StatCard label="Backers" value={String(projectFundings.length)} />
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
