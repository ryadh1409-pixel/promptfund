import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IdentityCard } from '@/components/cards/IdentityCard';
import { Card, EmptyState, LoadingState, PrimaryLink, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import type { V5Investment } from '@/types/InvestmentFlow';
import { getActiveRole } from '@/utils/roles';
import { safeCurrency, safeDate, safePercent } from '@/utils/safeFormat';

export default function PortfolioScreen() {
  const { authUser, profile } = useAuth();
  const activeRole = getActiveRole(profile);
  const isFounderMode = activeRole === 'founder';
  const [investments, setInvestments] = useState<V5Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalFunding = useMemo(
    () => investments.reduce((sum, investment) => sum + (investment.amount ?? 0), 0),
    [investments],
  );

  useEffect(() => {
    async function loadPortfolio() {
      if (!authUser) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const nextInvestments = isFounderMode
          ? await investmentFlowService.listInvestmentsByFounder(authUser.uid)
          : await investmentFlowService.listInvestmentsByInvestor(authUser.uid);
        setInvestments(nextInvestments);
      } catch (loadError) {
        setError(getFriendlyErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    loadPortfolio();
  }, [authUser, isFounderMode]);

  return (
    <Screen
      eyebrow={isFounderMode ? 'Funding Received' : 'My Investments'}
      title={isFounderMode ? 'Funding Received' : 'My Investments'}
      subtitle={
        isFounderMode
          ? 'Track completed Angel Investor funding and allocation records.'
          : 'Monitor active startup investments created through PromptFund agreements.'
      }
    >
      {isLoading ? <LoadingState label="Loading portfolio" /> : null}
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      {profile ? (
        <IdentityCard
          fullName={profile.displayName ?? profile.name}
          username={profile.username ?? profile.handle}
          role={profile.role}
          avatar={profile.avatar}
          photoURL={profile.photoURL}
          location={profile.location}
          bio={
            isFounderMode
              ? 'Founder profile for receiving angel investment funding.'
              : 'Angel Investor profile for backing startup opportunities.'
          }
          memberSince={profile.memberSince}
          compact
        />
      ) : null}

      <View style={ui.row}>
        <StatCard label={isFounderMode ? 'Funding Received' : 'Invested'} value={`${safeCurrency(totalFunding)} USD`} tone={colors.luxuryGold} />
        <StatCard label="Active Investments" value={String(investments.length)} tone={colors.accent} />
      </View>

      {!isLoading && investments.length === 0 ? (
        <EmptyState
          title={isFounderMode ? 'No funding received yet.' : 'No investments yet.'}
          message={
            isFounderMode
              ? 'Funding appears here after both parties agree and the Angel Investor completes payment.'
              : 'Start from an Investment Opportunity, open a discussion, accept the agreement, and complete payment.'
          }
          action={
            isFounderMode ? (
              <PrimaryLink href="/projects/create" label="Publish Opportunity" />
            ) : (
              <PrimaryLink href="/investor-feed" label="Browse Opportunities" />
            )
          }
        />
      ) : null}

      {!isLoading && investments.length > 0 ? (
        <View style={styles.list}>
          {isFounderMode ? <Text style={styles.sectionTitle}>Funding Received</Text> : <Text style={styles.sectionTitle}>My Investments</Text>}
          {investments.map((investment) => (
            <InvestmentRow key={investment.id} investment={investment} founderMode={isFounderMode} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function InvestmentRow({ investment, founderMode }: { investment: V5Investment; founderMode: boolean }) {
  const displayName = founderMode
    ? investment.investorName ?? 'Angel Investor'
    : investment.startupName ?? investment.note ?? 'Startup Investment';
  const meta = founderMode ? 'Angel Investor' : `Founder: ${investment.founderName ?? 'Unknown'}`;
  const status = founderMode ? 'Completed' : 'Active';

  return (
    <Card style={styles.investmentRow}>
      <View style={styles.rowHeader}>
        <View>
          <Text style={styles.startupName}>{displayName}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        <Text style={styles.status}>{status}</Text>
      </View>
      <View style={styles.detailGrid}>
        <Detail label="Amount" value={`${safeCurrency(investment.amount)} USD`} />
        <Detail label="Allocation" value={safePercent(investment.allocation)} />
        <Detail label="Date" value={safeDate(investment.paidAt ?? investment.fundedAt ?? investment.createdAt)} />
        <Detail label="Status" value={status} />
      </View>
    </Card>
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
  errorText: {
    color: colors.danger,
    lineHeight: 22,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  list: {
    gap: spacing.md,
  },
  investmentRow: {
    gap: spacing.md,
  },
  rowHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  startupName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  status: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
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
