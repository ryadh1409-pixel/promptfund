import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import type { InvestmentOpportunity } from '@/types/InvestmentFlow';
import { safeCurrency, safePercent } from '@/utils/safeFormat';

export function InvestmentOpportunityCard({
  opportunity,
  onView,
  onStartDiscussion,
}: {
  opportunity: InvestmentOpportunity;
  onView: () => void;
  onStartDiscussion: () => void | Promise<void>;
}) {
  return (
    <Card style={styles.card}>
      {opportunity.imageUrl ? <Image source={{ uri: opportunity.imageUrl }} style={styles.image} /> : null}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Investment Opportunity</Text>
          <Text style={styles.title}>{opportunity.startupName}</Text>
          <Text style={styles.founder}>Founder: {opportunity.founderName}</Text>
        </View>
        <View style={styles.stageBadge}>
          <Text style={styles.stageLabel}>Stage</Text>
          <Text style={styles.stageValue}>{opportunity.stage}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric label="Funding Needed" value={`${safeCurrency(opportunity.fundingNeeded)} USD`} />
        <Metric label="Investor Allocation" value={safePercent(opportunity.investorAllocation)} />
      </View>

      <View style={styles.purposeBox}>
        <Text style={styles.purposeLabel}>Purpose</Text>
        <Text style={styles.purpose}>{opportunity.purpose || opportunity.shortDescription}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onView} style={styles.secondaryAction}>
          <Text style={styles.secondaryText}>View Opportunity</Text>
        </Pressable>
        <View style={styles.primaryAction}>
          <PrimaryButton label="Start Discussion" onPress={onStartDiscussion} />
        </View>
      </View>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    borderColor: 'rgba(200, 162, 74, 0.42)',
    backgroundColor: '#111010',
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: radii.md,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  founder: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  stageBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 78,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: radii.md,
    padding: spacing.sm,
    backgroundColor: colors.black,
  },
  stageLabel: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  stageValue: {
    color: colors.ivory,
    fontSize: 16,
    fontWeight: '900',
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metric: {
    flex: 1,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.28)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.black,
  },
  metricLabel: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  purposeBox: {
    gap: spacing.xs,
  },
  purposeLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  purpose: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryAction: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: radii.pill,
    backgroundColor: colors.panelMuted,
  },
  secondaryText: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: '800',
  },
  primaryAction: {
    flex: 1,
  },
});
