import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

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
import { firestoreAdapter } from '@/firebase/firestore';
import { projectService } from '@/services/projectService';
import type { Expense } from '@/types/Expense';
import type { Project } from '@/types/Project';
import { formatCurrency } from '@/utils/format';

export default function ExpenseTrackingScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const approved = expenses.filter((expense) => expense.status === 'approved').length;

  useEffect(() => {
    async function loadExpenses() {
      setIsLoading(true);

      try {
        const [nextExpenses, nextProjects] = await Promise.all([
          firestoreAdapter.list<Expense>('expenses'),
          projectService.listProjects(),
        ]);

        setExpenses(nextExpenses);
        setProjects(nextProjects);
      } finally {
        setIsLoading(false);
      }
    }

    loadExpenses();
  }, []);

  return (
    <Screen
      eyebrow="PromptFund Expense Ledger"
      title="Show where every funded dollar goes"
      subtitle="Track AI-tool spend with receipt-ready expense records that investors can review before funding the next request."
    >
      {isLoading ? <LoadingState label="Loading verified expenses" /> : null}

      <View style={ui.row}>
        <StatCard label="Tracked spend" value={formatCurrency(total)} tone={colors.warning} />
        <StatCard label="Approved" value={String(approved)} tone={colors.success} />
      </View>

      <SectionTitle title="Recent expenses" />
      {!isLoading && expenses.length === 0 ? (
        <EmptyState
          title="No expenses tracked"
          message="PromptFund will show Cursor, Claude, API, hosting, and domain spend here once receipts are added."
          action={<PrimaryLink href="/funding/request" label="Request funding" variant="secondary" />}
        />
      ) : null}

      {!isLoading && expenses.map((expense) => {
        const project = projects.find((item) => item.id === expense.projectId);

        return (
          <Card key={expense.id}>
            <View style={ui.wrap}>
              <Pill
                label={expense.status}
                tone={expense.status === 'approved' ? 'rgba(52, 211, 153, 0.18)' : 'rgba(251, 191, 36, 0.18)'}
              />
              <Pill label={expense.category} />
            </View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{expense.title}</Text>
            <Text style={{ color: colors.muted }}>
              {expense.vendor} · {project?.title} · {expense.date}
            </Text>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
              {formatCurrency(expense.amount)}
            </Text>
          </Card>
        );
      })}
    </Screen>
  );
}
