import { Text, View } from 'react-native';

import { Card, Pill, Screen, SectionTitle, StatCard, ui } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { expenses, projects } from '@/data/mockData';
import { formatCurrency } from '@/utils/format';

export default function ExpenseTrackingScreen() {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const approved = expenses.filter((expense) => expense.status === 'approved').length;

  return (
    <Screen
      eyebrow="Expense Tracking"
      title="Show where every funded dollar goes."
      subtitle="Mock receipts and expense statuses prepare the future `expenses` collection without Firebase."
    >
      <View style={ui.row}>
        <StatCard label="Tracked spend" value={formatCurrency(total)} tone={colors.warning} />
        <StatCard label="Approved" value={String(approved)} tone={colors.success} />
      </View>

      <SectionTitle title="Recent expenses" />
      {expenses.map((expense) => {
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
