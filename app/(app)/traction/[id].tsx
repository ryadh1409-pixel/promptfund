import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StartupDetailCard } from '@/components/cards/StartupDetailCard';
import { Card, FieldPreview, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useStartupCardFromInvestment } from '@/hooks/useStartupCardFromOpportunity';
import { getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import type { V5Investment } from '@/types/InvestmentFlow';
import { safeCurrency, safeDate, safePercent } from '@/utils/safeFormat';

export default function TractionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const investmentId = typeof id === 'string' ? id : '';
  const [investment, setInvestment] = useState<V5Investment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { card: startupCard, isLoading: isLoadingCard } = useStartupCardFromInvestment(investment);

  useEffect(() => {
    if (!investmentId) {
      setIsLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(getPromptFundFirestore(), 'investments', investmentId),
      (snapshot) => {
        setInvestment(snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as V5Investment) : null);
        setIsLoading(false);
      },
      (error) => {
        setNotice(getFriendlyErrorMessage(error));
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [investmentId]);

  async function handleOpenChat() {
    if (!investment) {
      return;
    }

    try {
      setIsOpeningChat(true);
      setNotice(null);
      const roomId = await investmentFlowService.resolveDiscussionRoomId(investment);
      if (!roomId) {
        setNotice('Investment Chat room not found for this portfolio company.');
        return;
      }
      router.push(`/discussion-room/${roomId}`);
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsOpeningChat(false);
    }
  }

  if (isLoading) {
    return (
      <Screen eyebrow="Traction" title="Loading portfolio company" subtitle="Opening startup details.">
        <LoadingState label="Loading portfolio company" />
      </Screen>
    );
  }

  if (!investment) {
    return (
      <Screen eyebrow="Traction" title="Portfolio company not found" subtitle="This funded startup is unavailable.">
        <PrimaryButton label="Back to Traction" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen
      eyebrow="Traction"
      title={investment.startupName ?? 'Portfolio Company'}
      subtitle="Permanent portfolio company profile and deal room access."
    >
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      {isLoadingCard ? <LoadingState label="Loading startup card" /> : null}
      {!isLoadingCard && startupCard ? (
        <StartupDetailCard
          card={startupCard}
          stageLabel="Deal Completed"
        />
      ) : null}

      <View style={styles.detailGrid}>
        <View style={styles.detailGridCell}>
          <FieldPreview label="Founder" value={investment.founderName ?? 'Founder'} />
        </View>
        <View style={styles.detailGridCell}>
          <FieldPreview label="Angel Investor" value={investment.investorName ?? 'Angel Investor'} />
        </View>
        <View style={styles.detailGridCell}>
          <FieldPreview label="Investment Amount" value={safeCurrency(investment.fundedAmount ?? investment.amount)} />
        </View>
        <View style={styles.detailGridRow}>
          <View style={styles.detailGridHalf}>
            <FieldPreview label="Equity" value={safePercent(investment.allocation)} />
          </View>
          <View style={styles.detailGridHalf}>
            <PortfolioDetailField
              label="Startup Valuation"
              value="$2,200 USD"
              subtitle="Pre-Seed Valuation"
            />
          </View>
        </View>
        <View style={styles.detailGridCell}>
          <FieldPreview label="Investment Date" value={safeDate(investment.completedAt ?? investment.fundedAt ?? investment.createdAt)} />
        </View>
        <View style={styles.detailGridCell}>
          <FieldPreview label="Current Status" value={formatTractionStatus(investment.status)} />
        </View>
      </View>

      <PrimaryButton
        label={isOpeningChat ? 'Opening...' : 'Open Deal Room'}
        variant="secondary"
        onPress={handleOpenChat}
        disabled={isOpeningChat}
      />
    </Screen>
  );
}

function PortfolioDetailField({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailFieldLabel}>{label}</Text>
      <Text style={styles.detailFieldValue}>{value}</Text>
      {subtitle ? <Text style={styles.detailFieldSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function formatTractionStatus(status?: V5Investment['status']) {
  if (status === 'funding_confirmed') {
    return 'Funding Confirmed';
  }

  if (status === 'completed') {
    return 'Deal Completed';
  }

  return status ?? 'Active';
}

const styles = StyleSheet.create({
  notice: {
    color: colors.text,
    lineHeight: 22,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailGridCell: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: '47%',
  },
  detailGridRow: {
    flexBasis: '100%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.sm,
    minWidth: '100%',
  },
  detailGridHalf: {
    flex: 1,
    minWidth: 0,
  },
  detailField: {
    backgroundColor: colors.black,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  detailFieldLabel: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailFieldValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  detailFieldSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
