import { router } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StartupPlayingCard, mapInvestmentToStartupCard } from '@/components/cards/StartupPlayingCard';
import { Card, EmptyState, FieldPreview, LoadingState, PrimaryButton, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import type { V5Investment } from '@/types/InvestmentFlow';
import {
  dedupeInvestmentsById,
  describeTractionExclusion,
  isTractionPortfolioInvestment,
  logTractionQuerySnapshot,
} from '@/utils/tractionPortfolio';
import { safeCurrency, safeDate, safePercent } from '@/utils/safeFormat';

export default function TractionScreen() {
  const { authUser, profile } = useAuth();
  const isAdminMode = profile?.role === 'admin';
  const [investments, setInvestments] = useState<V5Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser?.uid) {
      setInvestments([]);
      setIsLoading(false);
      return;
    }

    setNotice(null);
    setIsLoading(true);
    const database = getPromptFundFirestore();
    const participantId = authUser.uid;

    let founderInvestments: V5Investment[] = [];
    let investorInvestments: V5Investment[] = [];
    let adminInvestments: V5Investment[] = [];

    const syncInvestments = () => {
      const nextInvestments = isAdminMode
        ? adminInvestments
        : dedupeInvestmentsById([...founderInvestments, ...investorInvestments]);
      const fundedInvestments = nextInvestments.filter(isTractionPortfolioInvestment);
      const excludedDocuments = nextInvestments.flatMap((investment) => {
        const reason = describeTractionExclusion(investment);
        return reason
          ? [{
            id: investment.id,
            status: investment.status ?? null,
            founderId: investment.founderId ?? null,
            investorId: investment.investorId ?? null,
            reason,
          }]
          : [];
      });

      logTractionQuerySnapshot({
        collection: 'investments',
        filters: isAdminMode
          ? { mode: 'admin', collection: 'investments/*' }
          : { founderId: participantId, investorId: participantId },
        rawDocumentCount: nextInvestments.length,
        documents: fundedInvestments.map((investment) => ({
          id: investment.id,
          status: investment.status ?? null,
          founderId: investment.founderId ?? null,
          investorId: investment.investorId ?? null,
          opportunityId: investment.opportunityId ?? null,
          startupId: investment.startupId ?? null,
          startupImage: investment.startupImage ?? null,
          fundedAmount: investment.fundedAmount ?? investment.amount ?? null,
          isTraction: investment.isTraction ?? null,
          isPortfolio: investment.isPortfolio ?? null,
          completedAt: investment.completedAt ?? null,
        })),
        excludedDocuments,
      });

      setInvestments((current) => updateArrayIfChanged(current, fundedInvestments));
      setIsLoading(false);
    };

    const handleSnapshotError = (error: unknown) => {
      setNotice(getFriendlyErrorMessage(error));
      setIsLoading(false);
    };

    const unsubscribeInvestments = isAdminMode
      ? onSnapshot(
        collection(database, 'investments'),
        (snapshot) => {
          adminInvestments = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as V5Investment);
          syncInvestments();
        },
        handleSnapshotError,
      )
      : (() => {
        const founderInvestmentsQuery = query(collection(database, 'investments'), where('founderId', '==', participantId));
        const investorInvestmentsQuery = query(collection(database, 'investments'), where('investorId', '==', participantId));

        const unsubscribeFounderInvestments = onSnapshot(
          founderInvestmentsQuery,
          (snapshot) => {
            founderInvestments = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as V5Investment);
            syncInvestments();
          },
          handleSnapshotError,
        );
        const unsubscribeInvestorInvestments = onSnapshot(
          investorInvestmentsQuery,
          (snapshot) => {
            investorInvestments = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as V5Investment);
            syncInvestments();
          },
          handleSnapshotError,
        );

        return () => {
          unsubscribeFounderInvestments();
          unsubscribeInvestorInvestments();
        };
      })();

    return () => {
      if (typeof unsubscribeInvestments === 'function') {
        unsubscribeInvestments();
      }
    };
  }, [authUser?.uid, isAdminMode]);

  const totalCapital = investments.reduce(
    (sum, investment) => sum + (investment.fundedAmount ?? investment.amount ?? 0),
    0,
  );

  return (
    <Screen
      eyebrow="Traction"
      title="Portfolio Companies"
      subtitle="Funded investments, portfolio profiles, and Deal Room access in one place."
    >
      {isLoading ? <LoadingState label="Loading Traction portfolio" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      <View style={ui.row}>
        <StatCard label="Portfolio Companies" value={String(investments.length)} tone={colors.luxuryGold} />
        <StatCard label="Total Capital" value={safeCurrency(totalCapital)} tone={colors.success} />
      </View>
      {!isLoading && investments.length === 0 ? (
        <EmptyState
          title="No funded portfolio companies yet."
          message="Completed investments stay here permanently after funding is confirmed."
        />
      ) : null}

      {investments.map((investment) => (
        <PortfolioCompanyCard
          key={investment.id}
          investment={investment}
          onNotice={setNotice}
        />
      ))}
    </Screen>
  );
}

function PortfolioCompanyCard({
  investment,
  onNotice,
}: {
  investment: V5Investment;
  onNotice: (message: string | null) => void;
}) {
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  async function handleOpenChat() {
    try {
      setIsOpeningChat(true);
      onNotice(null);
      const roomId = await investmentFlowService.resolveDiscussionRoomId(investment);
      if (!roomId) {
        onNotice('Investment Chat room not found for this portfolio company.');
        return;
      }
      router.push(`/discussion-room/${roomId}`);
    } catch (error) {
      onNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsOpeningChat(false);
    }
  }

  return (
    <Card style={styles.companyCard}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.companyTitle}>{investment.startupName ?? 'Portfolio Company'}</Text>
          <Text style={styles.meta}>Founder: {investment.founderName ?? 'Founder'}</Text>
          <Text style={styles.meta}>Angel Investor: {investment.investorName ?? 'Angel Investor'}</Text>
        </View>
      </View>

      <View style={styles.cardWrap}>
        <StartupPlayingCard
          card={mapInvestmentToStartupCard(investment)}
          stageLabel="Deal Completed"
        />
      </View>

      <View style={styles.founderRow}>
        <View style={styles.founderAvatar}>
          <Text style={styles.founderAvatarText}>{initials(investment.founderName)}</Text>
        </View>
        <View>
          <Text style={styles.founderName}>{investment.founderName ?? 'Founder'}</Text>
          <Text style={styles.meta}>Permanent portfolio company profile</Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
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
    </Card>
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

function updateArrayIfChanged<T>(current: T[], next: T[]) {
  return stableStringify(current) === stableStringify(next) ? current : next;
}

function stableStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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

function initials(value?: string) {
  return value
    ?.split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PF';
}

const styles = StyleSheet.create({
  notice: {
    color: colors.text,
    lineHeight: 22,
  },
  companyCard: {
    gap: spacing.md,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  companyTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardWrap: {
    width: '100%',
  },
  founderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  founderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.luxuryGold,
  },
  founderAvatarText: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '900',
  },
  founderName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
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
