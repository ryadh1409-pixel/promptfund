import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { ProjectCard } from '@/components/project/ProjectCard';
import {
  Card,
  EmptyState,
  LoadingState,
  Pill,
  PrimaryLink,
  Screen,
  SectionTitle,
  StatCard,
  ui,
} from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { firestoreAdapter } from '@/firebase/firestore';
import { fundingService } from '@/services/fundingService';
import { projectService } from '@/services/projectService';
import type { Expense } from '@/types/Expense';
import type { Investment, FundingRequest } from '@/types/FundingRequest';
import type { Project } from '@/types/Project';
import { formatCurrency } from '@/utils/format';

export default function DashboardScreen() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [fundingRequests, setFundingRequests] = useState<FundingRequest[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const totalRaised = projects.reduce((sum, project) => sum + project.fundedAmount, 0);
  const pendingExpenses = expenses.filter((expense) => expense.status === 'pending').length;

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);

      try {
        const [nextProjects, nextRequests, nextInvestments, nextExpenses] = await Promise.all([
          projectService.listProjects(),
          fundingService.listFundingRequests(),
          fundingService.listInvestments(),
          firestoreAdapter.list<Expense>('expenses'),
        ]);

        setProjects(nextProjects);
        setFundingRequests(nextRequests);
        setInvestments(nextInvestments);
        setExpenses(nextExpenses);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <Screen
      eyebrow={`PromptFund workspace for ${profile?.name ?? 'your team'}`}
      title="Investor-grade funding command center"
      subtitle="Track project capital, verified expenses, investor activity, and Fund Points from one startup-ready dashboard."
    >
      {isLoading ? <LoadingState label="Loading PromptFund capital dashboard" /> : null}

      <View style={ui.row}>
        <StatCard label="Raised" value={formatCurrency(totalRaised)} tone={colors.success} />
        <StatCard label="Open asks" value={String(fundingRequests.length)} tone={colors.accent} />
      </View>
      <View style={ui.row}>
        <StatCard label="Investments" value={String(investments.length)} />
        <StatCard label="Pending expenses" value={String(pendingExpenses)} tone={colors.warning} />
      </View>

      <Card>
        <View style={ui.wrap}>
          <PrimaryLink href="/projects/create" label="Create Project" />
          <PrimaryLink href="/funding/request" label="Request Funding" variant="secondary" />
        </View>
        <View style={ui.wrap}>
          <PrimaryLink href="/projects" label="Projects" variant="secondary" />
          <PrimaryLink href="/expenses" label="Expenses" variant="secondary" />
        </View>
        <View style={ui.wrap}>
          <PrimaryLink href="/wallet" label="Fund Points" variant="secondary" />
          <PrimaryLink href="/profile" label="Profile" variant="secondary" />
        </View>
      </Card>

      <SectionTitle title="Active projects" />
      {!isLoading && projects.length === 0 ? (
        <EmptyState
          title="No funded builds yet"
          message="Create a PromptFund project to package your tool budget, milestone plan, and proof trail for investors."
          action={<PrimaryLink href="/projects/create" label="Create first project" />}
        />
      ) : null}
      {!isLoading && projects.map((project) => <ProjectCard key={project.id} project={project} />)}

      <SectionTitle title="Latest funding request" />
      {!isLoading && fundingRequests.length === 0 ? (
        <EmptyState
          title="No funding requests"
          message="Post a focused AI-tool request when a project needs capital for Cursor, Claude, API credits, hosting, or domains."
          action={<PrimaryLink href="/funding/request" label="Request funding" />}
        />
      ) : null}
      {!isLoading && fundingRequests.length > 0 ? (
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
      ) : null}
    </Screen>
  );
}
