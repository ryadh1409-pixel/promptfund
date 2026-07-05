import { StyleSheet, Text, View } from 'react-native';

import { FieldPreview } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import type { InvestmentAgreement, V5Investment } from '@/types/InvestmentFlow';
import { safeCurrency, safeDate, safePercent } from '@/utils/safeFormat';

export function DealRoomCompletionSection({
  agreement,
  investment,
}: {
  agreement: InvestmentAgreement | null;
  investment: V5Investment | null;
}) {
  const startupName = agreement?.startupName ?? investment?.startupName ?? 'Portfolio Company';
  const isCompleted = agreement?.status === 'completed' || investment?.status === 'completed';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{isCompleted ? 'Deal Completed' : 'Deal Completion'}</Text>
      <Text style={styles.body}>
        {isCompleted
          ? 'This investment is complete. The Deal Room chat and portfolio record remain permanently available.'
          : 'Complete funding confirmation to finalize this investment in Traction.'}
      </Text>
      <View style={styles.grid}>
        <FieldPreview label="Startup" value={startupName} />
        <FieldPreview label="Founder" value={agreement?.founderName ?? investment?.founderName ?? 'Founder'} />
        <FieldPreview label="Angel Investor" value={agreement?.investorName ?? investment?.investorName ?? 'Investor'} />
        <FieldPreview label="Amount" value={safeCurrency(investment?.fundedAmount ?? agreement?.investmentAmount)} />
        <FieldPreview label="Allocation" value={safePercent(investment?.allocation ?? agreement?.investorAllocation)} />
        <FieldPreview label="Completion Date" value={safeDate(agreement?.completedAt ?? investment?.completedAt)} />
      </View>
      <Text style={styles.disclaimer}>PromptFund did not process or handle any funds related to this agreement.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  body: {
    color: colors.muted,
    lineHeight: 20,
  },
  grid: {
    gap: spacing.md,
  },
  disclaimer: {
    color: colors.subtle,
    fontSize: 12,
    lineHeight: 18,
  },
});
