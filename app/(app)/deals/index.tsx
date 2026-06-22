import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { StartupPlayingCard, sampleStartupCards, type StartupCard } from '@/components/cards/StartupPlayingCard';
import { Card, LoadingState, Pill, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { agreementService } from '@/services/agreementService';
import { fundingService } from '@/services/fundingService';
import { projectService } from '@/services/projectService';
import type { InvestmentInterest, Match } from '@/types/FundingRequest';
import { formatCurrency } from '@/utils/format';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { getRoleBadgeLabel, isEntrepreneurRole } from '@/utils/roles';

export default function DealsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{
    startup?: string;
    amount?: string;
    equity?: string;
    founder?: string;
  }>();
  const [isClosed, setIsClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [incomingInterests, setIncomingInterests] = useState<InvestmentInterest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const isEntrepreneur = isEntrepreneurRole(profile?.role);
  const dealScale = useRef(new Animated.Value(0.92)).current;
  const startupName = params.startup ?? sampleStartupCards[0].title;
  const amount = Number(params.amount ?? 5000);
  const equity = Number(params.equity ?? 4);
  const founder = params.founder ?? sampleStartupCards[0].founderName ?? 'Founder';
  const founderCard: StartupCard = {
    ...sampleStartupCards[0],
    title: startupName,
    founderName: founder,
    goalAmount: Math.max(amount * 10, amount),
    equityOffered: equity,
  };
  const investorCard: StartupCard = {
    id: 'investor-card',
    developerId: 'investor',
    ownerId: 'investor',
    title: profile?.name ?? 'Investor',
    tagline: 'Ready to back builders.',
    description: 'A simple investor profile for starting founder conversations.',
    goalAmount: amount,
    equityOffered: equity,
    metric: 'Interested',
    founderName: profile?.name ?? 'Investor',
    founderAvatar: profile?.avatar ?? 'PF',
    founderVerified: true,
    rank: 'K',
  };

  useEffect(() => {
    async function loadDealFlow() {
      if (!profile?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [founderInterests, founderMatches, investorMatches] = await Promise.all([
          fundingService.listInterestsByFounder(profile.id),
          fundingService.listMatchesByFounder(profile.id),
          fundingService.listMatchesByInvestor(profile.id),
        ]);
        setIncomingInterests(founderInterests.filter((interest) => interest.status === 'interested'));
        setMatches([...founderMatches, ...investorMatches]);
      } catch (loadError) {
        setNotice(getFriendlyErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    loadDealFlow();
  }, [profile?.id]);

  function handleCloseDeal() {
    setIsClosed(true);
    Animated.sequence([
      Animated.spring(dealScale, {
        toValue: 1.04,
        useNativeDriver: true,
      }),
      Animated.spring(dealScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }

  async function handleAcceptInterest(interest: InvestmentInterest) {
    setNotice(null);
    try {
      const match = await fundingService.acceptInvestmentInterest(interest);
      setIncomingInterests((items) => items.filter((item) => item.id !== interest.id));
      setMatches((items) => [match, ...items]);
      setNotice('Match created. Agreement unlocked.');
    } catch (acceptError) {
      setNotice(getFriendlyErrorMessage(acceptError));
    }
  }

  async function handleStartAgreement(match: Match) {
    try {
      const project = await projectService.getProjectById(match.startupId);
      const agreementId = match.agreementId ?? `agreement-${match.id}`;
      const amount = Math.max(Math.round((project?.goalAmount ?? 50000) * 0.1), 1000);
      const equity = project?.equityOffered ?? 4;

      const existingRoom = await agreementService.getAgreementRoom(agreementId);
      if (!existingRoom) {
        await agreementService.createAgreementRoom({
        agreementId,
        meetingId: `meeting-${agreementId}`,
        founderId: match.founderUid,
        investorId: match.investorUid,
        adminIds: [],
        projectId: match.startupId,
        status: 'scheduled',
        phase: 'phase1Verification',
        verificationStatus: 'pending',
        recordingStatus: 'idle',
        durationSeconds: 0,
        participantsVerified: false,
        currentStep: 'opening',
        founderConfirmed: false,
        investorConfirmed: false,
        riskAcknowledged: false,
        termsAcknowledged: false,
        unresolvedDisputes: false,
        investmentAmount: amount,
        equityPercentage: equity,
        repaymentTerms: 'SAFE terms to be reviewed by both parties.',
        agreementText: `${project?.title ?? 'Startup'} investment draft. Both parties can edit terms before signing.`,
        investorSigned: false,
        founderSigned: false,
        });
      }
      await agreementService.saveContract({
      agreementId,
      matchId: match.id,
      projectId: match.startupId,
      founderId: match.founderUid,
      investorId: match.investorUid,
      investmentAmount: amount,
      equityPercentage: equity,
      termType: 'SAFE',
      customTerms: 'Investor and founder will review SAFE, convertible note, revenue share, or custom terms with PromptFund Witness.',
      editedBy: profile?.id ?? match.investorUid,
      });
      await fundingService.updateMatch(match.id, {
        agreementId,
        status: 'agreementStarted',
      });
      router.push(`/agreement-room/${agreementId}`);
    } catch (agreementError) {
      setNotice(getFriendlyErrorMessage(agreementError));
    }
  }

  return (
    <Screen
      eyebrow={isEntrepreneur ? 'Investor Matches' : 'Deal Table'}
      title={isEntrepreneur ? 'Manage investor matches.' : 'Founder meets investor.'}
      subtitle={isEntrepreneur ? 'Accept interest, unlock agreements, and track investor progress.' : 'Simple cards. Simple next step.'}
    >
      {profile ? <Pill label={getRoleBadgeLabel(profile.role)} tone="rgba(200,162,74,0.18)" /> : null}
      <View style={styles.table}>
        <View style={styles.smallCard}>
          <StartupPlayingCard card={founderCard} compact />
          <Text style={styles.cardLabel}>Founder Card</Text>
        </View>
        <View style={styles.handshake}>
          <Text style={styles.handshakeText}>♣</Text>
        </View>
        <View style={styles.smallCard}>
          <StartupPlayingCard card={investorCard} compact />
          <Text style={styles.cardLabel}>Investor Card</Text>
        </View>
      </View>

      <Card>
        <Text style={styles.summaryTitle}>Deal summary</Text>
        <Text style={styles.summaryText}>
          {profile?.name ?? 'Investor'} is interested in {startupName} at {formatCurrency(amount)} for {equity}% equity.
        </Text>
        <PrimaryButton label="Start Discussion" onPress={() => router.push('/messages')} />
        <PrimaryButton
          label={isClosed ? 'Deal Card Generated' : 'Generate Deal Card'}
          variant="secondary"
          onPress={handleCloseDeal}
        />
      </Card>

      {notice ? (
        <Card>
          <Text style={styles.noticeText}>{notice}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.summaryTitle}>Match Pipeline</Text>
        {isLoading ? <LoadingState label="Loading matches" /> : null}
        {!isLoading && incomingInterests.length === 0 && matches.length === 0 ? (
          <Text style={styles.summaryText}>
            {isEntrepreneur
              ? 'Investor interest appears here after a right swipe. Accept interest to unlock the Agreement Room.'
              : 'Matches appear here after founders accept your interest.'}
          </Text>
        ) : null}
        {incomingInterests.map((interest) => (
          <View key={interest.id} style={styles.pipelineItem}>
            <View style={styles.pipelineCopy}>
              <Text style={styles.pipelineTitle}>Incoming investor interest</Text>
              <Text style={styles.pipelineMeta}>Startup {interest.startupId}</Text>
            </View>
            <PrimaryButton label="Accept" onPress={() => handleAcceptInterest(interest)} />
          </View>
        ))}
        {matches.map((match) => (
          <View key={match.id} style={styles.pipelineItem}>
            <View style={styles.pipelineCopy}>
              <Text style={styles.pipelineTitle}>Matched</Text>
              <Text style={styles.pipelineMeta}>Startup {match.startupId}</Text>
            </View>
            <PrimaryButton
              label={match.agreementId ? 'Open Agreement' : 'Start Agreement'}
              onPress={() => handleStartAgreement(match)}
            />
          </View>
        ))}
      </Card>

      {isClosed ? (
        <Animated.View style={[styles.dealCard, { transform: [{ scale: dealScale }] }]}>
          <Text style={styles.dealRank}>A ♥</Text>
          <Text style={styles.dealTitle}>DEAL CLOSED</Text>
          <Text style={styles.dealLine}>Investment Amount: {formatCurrency(amount)}</Text>
          <Text style={styles.dealLine}>Equity: {equity}%</Text>
          <Text style={styles.dealLine}>Founder: {founder}</Text>
          <Text style={styles.dealLine}>Investor: {profile?.name ?? 'Investor'}</Text>
          <Text style={styles.dealDate}>Date: {new Date().toLocaleDateString()}</Text>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  table: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  smallCard: {
    flex: 1,
    gap: spacing.sm,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  handshake: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: 22,
    backgroundColor: colors.cardIvory,
  },
  handshakeText: {
    color: colors.pokerRed,
    fontSize: 24,
    fontWeight: '900',
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  summaryText: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
  },
  noticeText: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '900',
  },
  pipelineItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.22)',
    borderRadius: radii.md,
    backgroundColor: colors.panelMuted,
    padding: spacing.md,
  },
  pipelineCopy: {
    flex: 1,
    gap: 4,
  },
  pipelineTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  pipelineMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  dealCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: radii.lg,
    backgroundColor: colors.cardIvory,
    padding: spacing.xl,
  },
  dealRank: {
    color: colors.pokerRed,
    fontSize: 22,
    fontWeight: '900',
  },
  dealTitle: {
    color: colors.pokerBlack,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
  },
  dealLine: {
    color: colors.pokerBlack,
    fontSize: 16,
    fontWeight: '800',
  },
  dealDate: {
    color: colors.luxuryGold,
    fontSize: 14,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
});
