import { Text, View } from 'react-native';

import { ProjectCard } from '@/components/project/ProjectCard';
import {
  Card,
  Pill,
  PrimaryLink,
  Screen,
  SectionTitle,
  StatCard,
  ui,
} from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { currentUser, expenses, fundingRequests, fundings, projects } from '@/data/mockData';
import { formatCurrency } from '@/utils/format';

export default function DashboardScreen() {
  const totalRaised = projects.reduce((sum, project) => sum + project.fundedAmount, 0);
  const pendingExpenses = expenses.filter((expense) => expense.status === 'pending').length;

  return (
    <Screen
      eyebrow={`Welcome back, ${currentUser.name}`}
      title="Builder capital dashboard"
      subtitle="Track funding requests, investor activity, expenses, and Fund Points from one place."
    >
      <View style={ui.row}>
        <StatCard label="Raised" value={formatCurrency(totalRaised)} tone={colors.success} />
        <StatCard label="Open asks" value={String(fundingRequests.length)} tone={colors.accent} />
      </View>
      <View style={ui.row}>
        <StatCard label="Backers" value={String(fundings.length)} />
        <StatCard label="Pending expenses" value={String(pendingExpenses)} tone={colors.warning} />
      </View>

      <Card>
        <View style={ui.wrap}>
          <PrimaryLink href="/projects/create" label="Create Project" />
          <PrimaryLink href="/funding/request" label="Request Funding" variant="secondary" />
        </View>
        <View style={ui.wrap}>
          <PrimaryLink href="/investor-feed" label="Investor Feed" variant="secondary" />
          <PrimaryLink href="/expenses" label="Expenses" variant="secondary" />
        </View>
        <View style={ui.wrap}>
          <PrimaryLink href="/wallet" label="Fund Points" variant="secondary" />
          <PrimaryLink href="/profile" label="Profile" variant="secondary" />
        </View>
      </Card>

      <SectionTitle title="Active projects" />
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}

      <SectionTitle title="Latest funding request" />
      <Card>
        <View style={ui.wrap}>
          <Pill label={fundingRequests[0].tool} tone="rgba(139, 92, 246, 0.28)" />
          <Pill label={fundingRequests[0].status} tone="rgba(34, 211, 238, 0.18)" />
        </View>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
          {formatCurrency(fundingRequests[0].amount)} for {fundingRequests[0].tool}
        </Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>{fundingRequests[0].reason}</Text>
      </Card>
    </Screen>
  );
}
