import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, EmptyState, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import type { V5Investment } from '@/types/InvestmentFlow';
import { getActiveRole } from '@/utils/roles';
import { safeCurrency, safeDate, safePercent } from '@/utils/safeFormat';
import { router } from 'expo-router';

export default function ArchivePortfolioScreen() {
  const { authUser, profile } = useAuth();
  const isFounderMode = getActiveRole(profile) === 'founder';
  const [investments, setInvestments] = useState<V5Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed'>('all');

  useEffect(() => {
    async function loadArchive() {
      if (!authUser) {
        setIsLoading(false);
        return;
      }

      try {
        setNotice(null);
        const nextInvestments = isFounderMode
          ? await investmentFlowService.listInvestmentsByFounder(authUser.uid)
          : await investmentFlowService.listInvestmentsByInvestor(authUser.uid);
        setInvestments(nextInvestments.filter((investment) => investment.status === 'completed' || investment.status === 'active'));
      } catch (error) {
        setNotice(getFriendlyErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadArchive();
  }, [authUser, isFounderMode]);

  const totalCapital = investments.reduce((sum, investment) => sum + (investment.amount ?? 0), 0);
  const averageInvestment = investments.length > 0 ? totalCapital / investments.length : 0;
  const visibleInvestments = investments.filter((investment) => {
    if (filter === 'completed' && investment.status !== 'completed' && investment.status !== 'active') {
      return false;
    }

    const haystack = [
      investment.startupName,
      investment.founderName,
      investment.investorName,
    ].join(' ').toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  return (
    <Screen
      eyebrow="Archive / Portfolio"
      title="Completed Investments"
      subtitle="Completed startup agreements move here after Stage 5."
    >
      {isLoading ? <LoadingState label="Loading completed investments" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      <View style={styles.summaryGrid}>
        <Card style={styles.summaryCard}>
          <Text style={styles.metricLabel}>Completed Deals</Text>
          <Text style={styles.metricValue}>{investments.length} Deals</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={styles.metricLabel}>Total Capital Completed</Text>
          <Text style={styles.metricValue}>{safeCurrency(totalCapital)}</Text>
        </Card>
      </View>
      <Card style={styles.filterCard}>
        <TextInput
          placeholder="Search completed investments"
          placeholderTextColor={colors.subtle}
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />
        <View style={styles.filterRow}>
          {(['all', 'completed'] as const).map((item) => (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item ? styles.filterChipActive : null]}>
              <Text style={styles.filterText}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.meta}>Average Investment: {safeCurrency(averageInvestment)}</Text>
      </Card>

      {!isLoading && visibleInvestments.length === 0 ? (
        <EmptyState
          title="No completed investments yet."
          message="Completed Stage 5 startup agreements will appear in Archive / Portfolio."
          action={<PrimaryButton label="Back To My Cards" variant="secondary" onPress={() => router.replace('/deck')} />}
        />
      ) : null}

      {visibleInvestments.map((investment) => (
        <Card key={investment.id} style={styles.archiveCard}>
          <Text style={styles.title}>{investment.startupName ?? 'Startup Investment'}</Text>
          <Text style={styles.meta}>Founder: {investment.founderName ?? 'Unknown'}</Text>
          <Text style={styles.meta}>Investor: {investment.investorName ?? 'Unknown'}</Text>
          <View style={styles.detailGrid}>
            <Detail label="Amount" value={safeCurrency(investment.amount)} />
            <Detail label="Allocation" value={safePercent(investment.allocation)} />
            <Detail label="Completed" value={safeDate(investment.fundedAt ?? investment.createdAt)} />
            <Detail label="Status" value="Completed" />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    color: colors.text,
    lineHeight: 22,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
  },
  metricLabel: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.luxuryGold,
    fontSize: 20,
    fontWeight: '900',
  },
  archiveCard: {
    gap: spacing.sm,
  },
  filterCard: {
    gap: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.black,
  },
  filterChipActive: {
    borderColor: colors.luxuryGold,
    backgroundColor: 'rgba(200, 162, 74, 0.16)',
  },
  filterText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.36)',
    borderRadius: radii.md,
    backgroundColor: colors.panelMuted,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontWeight: '700',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detail: {
    minWidth: '47%',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: colors.black,
  },
  detailLabel: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
});
