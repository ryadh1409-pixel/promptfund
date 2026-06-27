import { router } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StartupPlayingCard, type StartupCard } from '@/components/cards/StartupPlayingCard';
import { Card, EmptyState, LoadingState, PrimaryButton, PrimaryLink, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import { userService } from '@/services/userService';
import type { InvestmentInterest, Match } from '@/types/FundingRequest';
import type { DiscussionRoom, InvestmentAgreement, InvestmentOpportunity, StartupInterest, V5Investment } from '@/types/InvestmentFlow';
import {
  buildDealPipelines,
  getPipelineStageMeta,
  pipelineSteps,
  splitPipelinesByActivity,
  type DealPipeline,
  type OpportunityMap,
} from '@/utils/investmentPipeline';
import { getActiveRole } from '@/utils/roles';
import { safeCurrency, safePercent } from '@/utils/safeFormat';

export default function MyCardsScreen() {
  const { authUser, profile } = useAuth();
  const activeRole = getActiveRole(profile);
  const isFounderMode = activeRole === 'founder';
  const [investments, setInvestments] = useState<V5Investment[]>([]);
  const [interests, setInterests] = useState<InvestmentInterest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [discussionRooms, setDiscussionRooms] = useState<DiscussionRoom[]>([]);
  const [agreements, setAgreements] = useState<InvestmentAgreement[]>([]);
  const [founderCards, setFounderCards] = useState<InvestmentOpportunity[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const totalFunding = useMemo(
    () => investments.reduce((sum, investment) => sum + (investment.amount ?? 0), 0),
    [investments],
  );
  const dealPipelines = useMemo(
    () => buildDealPipelines({
      founderCards,
      interests,
      matches,
      discussionRooms,
      agreements,
      investments,
      opportunities,
      includeFounderCards: isFounderMode,
    }),
    [agreements, discussionRooms, founderCards, interests, investments, isFounderMode, matches, opportunities],
  );
  const { activePipelines, archivedPipelines } = splitPipelinesByActivity(dealPipelines);
  const archivedCount = archivedPipelines.length;
  const completedCapital = archivedPipelines.reduce((sum, pipeline) => {
    const amount = pipeline.investment?.amount ?? pipeline.agreement?.investmentAmount ?? pipeline.room?.investmentAmount ?? 0;
    return sum + amount;
  }, 0);

  const loadMyCards = useCallback(async () => {
    if (!authUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNotice(null);
    try {
      const [nextInvestments, nextInterests, nextMatches, nextDiscussionRooms] = await Promise.all([
        isFounderMode
          ? investmentFlowService.listInvestmentsByFounder(authUser.uid)
          : investmentFlowService.listInvestmentsByInvestor(authUser.uid),
        isFounderMode
          ? investmentFlowService.listInterestsByFounder(authUser.uid)
          : investmentFlowService.listInterestsByInvestor(authUser.uid),
        isFounderMode
          ? investmentFlowService.listMatchesByFounder(authUser.uid)
          : investmentFlowService.listMatchesByInvestor(authUser.uid),
        isFounderMode
          ? investmentFlowService.listDiscussionRoomsByFounder(authUser.uid)
          : investmentFlowService.listDiscussionRoomsByInvestor(authUser.uid),
      ]);
      const nextAgreements = (await Promise.all(
        nextDiscussionRooms
          .map((room) => room.agreementId)
          .filter((agreementId): agreementId is string => Boolean(agreementId))
          .map((agreementId) => investmentFlowService.getAgreement(agreementId)),
      )).filter((agreement): agreement is InvestmentAgreement => Boolean(agreement));

      const startupIds = Array.from(new Set([
        ...nextInterests.map((interest) => interest.startupId),
        ...nextMatches.map((match) => match.startupId),
        ...nextDiscussionRooms.map((room) => room.opportunityId),
        ...nextAgreements.map((agreement) => agreement.opportunityId),
        ...nextInvestments.map((investment) => investment.opportunityId).filter((opportunityId): opportunityId is string => Boolean(opportunityId)),
      ]));
      const opportunityEntries = await Promise.all(
        startupIds.map(async (startupId) => {
          const existingOpportunity = await investmentFlowService.getOpportunity(startupId);
          if (existingOpportunity) {
            return [startupId, existingOpportunity] as const;
          }

          return null;
        }),
      );

      setInvestments(nextInvestments);
      setInterests(nextInterests);
      setMatches(nextMatches);
      setDiscussionRooms(nextDiscussionRooms);
      setAgreements(nextAgreements);
      setOpportunities(Object.fromEntries(opportunityEntries.filter(Boolean) as Array<readonly [string, InvestmentOpportunity]>));
    } catch (loadError) {
      setNotice(getFriendlyErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [authUser, isFounderMode]);

  useEffect(() => {
    loadMyCards();
  }, [loadMyCards]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    const database = getPromptFundFirestore();
    const interestsQuery = query(
      collection(database, 'interests'),
      where(isFounderMode ? 'founderId' : 'investorId', '==', authUser.uid),
    );
    const matchesQuery = query(
      collection(database, 'matches'),
      where(isFounderMode ? 'founderUid' : 'investorUid', '==', authUser.uid),
    );
    const roomsQuery = query(
      collection(database, 'discussionRooms'),
      where(isFounderMode ? 'founderId' : 'investorId', '==', authUser.uid),
    );
    const investmentsQuery = query(
      collection(database, 'investments'),
      where(isFounderMode ? 'founderId' : 'investorId', '==', authUser.uid),
    );
    const agreementsQuery = query(
      collection(database, 'agreements'),
      where(isFounderMode ? 'founderId' : 'investorId', '==', authUser.uid),
    );

    const interestsPath = `interests/*?${isFounderMode ? 'founderId' : 'investorId'}==${authUser.uid}`;
    const matchesPath = `matches/*?${isFounderMode ? 'founderUid' : 'investorUid'}==${authUser.uid}`;
    const roomsPath = `discussionRooms/*?${isFounderMode ? 'founderId' : 'investorId'}==${authUser.uid}`;
    const investmentsPath = `investments/*?${isFounderMode ? 'founderId' : 'investorId'}==${authUser.uid}`;
    const agreementsPath = `agreements/*?${isFounderMode ? 'founderId' : 'investorId'}==${authUser.uid}`;

    console.info('[PromptFund Firestore] read start', { path: interestsPath, operation: 'onSnapshot' });
    const unsubscribeInterests = onSnapshot(interestsQuery, (snapshot) => {
      console.info('[PromptFund Firestore] read success', { path: interestsPath, operation: 'onSnapshot', count: snapshot.docs.length });
      setInterests(snapshot.docs.map((item) => mapStartupInterestToLegacy({ ...item.data(), id: item.id } as StartupInterest)));
    }, (error) => {
      console.error('[PromptFund Firestore] read failure', { path: interestsPath, operation: 'onSnapshot', error });
      setNotice(getFriendlyErrorMessage(error));
    });
    console.info('[PromptFund Firestore] read start', { path: matchesPath, operation: 'onSnapshot' });
    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
      console.info('[PromptFund Firestore] read success', { path: matchesPath, operation: 'onSnapshot', count: snapshot.docs.length });
      setMatches(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Match));
    }, (error) => {
      console.error('[PromptFund Firestore] read failure', { path: matchesPath, operation: 'onSnapshot', error });
      setNotice(getFriendlyErrorMessage(error));
    });
    console.info('[PromptFund Firestore] read start', { path: roomsPath, operation: 'onSnapshot' });
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      console.info('[PromptFund Firestore] read success', { path: roomsPath, operation: 'onSnapshot', count: snapshot.docs.length });
      setDiscussionRooms(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as DiscussionRoom));
    }, (error) => {
      console.error('[PromptFund Firestore] read failure', { path: roomsPath, operation: 'onSnapshot', error });
      setNotice(getFriendlyErrorMessage(error));
    });
    console.info('[PromptFund Firestore] read start', { path: investmentsPath, operation: 'onSnapshot' });
    const unsubscribeInvestments = onSnapshot(investmentsQuery, (snapshot) => {
      console.info('[PromptFund Firestore] read success', { path: investmentsPath, operation: 'onSnapshot', count: snapshot.docs.length });
      setInvestments(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as V5Investment));
    }, (error) => {
      console.error('[PromptFund Firestore] read failure', { path: investmentsPath, operation: 'onSnapshot', error });
      setNotice(getFriendlyErrorMessage(error));
    });
    console.info('[PromptFund Firestore] read start', { path: agreementsPath, operation: 'onSnapshot' });
    const unsubscribeAgreements = onSnapshot(agreementsQuery, (snapshot) => {
      console.info('[PromptFund Firestore] read success', { path: agreementsPath, operation: 'onSnapshot', count: snapshot.docs.length });
      setAgreements(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as InvestmentAgreement));
    }, (error) => {
      console.error('[PromptFund Firestore] read failure', { path: agreementsPath, operation: 'onSnapshot', error });
      setNotice(getFriendlyErrorMessage(error));
    });

    return () => {
      unsubscribeInterests();
      unsubscribeMatches();
      unsubscribeRooms();
      unsubscribeInvestments();
      unsubscribeAgreements();
    };
  }, [authUser, isFounderMode]);

  useEffect(() => {
    if (!authUser || !isFounderMode) {
      setFounderCards([]);
      console.log('Loaded founder cards', 0);
      return;
    }

    const founderCardsQuery = query(
      collection(getPromptFundFirestore(), 'startupOpportunities'),
      where('founderId', '==', authUser.uid),
    );

    const founderCardsPath = `startupOpportunities/*?founderId==${authUser.uid}`;
    console.info('[PromptFund Firestore] read start', { path: founderCardsPath, operation: 'onSnapshot' });
    const unsubscribe = onSnapshot(
      founderCardsQuery,
      (snapshot) => {
        const cards = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as InvestmentOpportunity);
        console.info('[PromptFund Firestore] read success', {
          path: founderCardsPath,
          operation: 'onSnapshot',
          count: snapshot.docs.length,
        });
        console.log('Loaded founder cards', cards.length);
        setFounderCards(cards);
        setOpportunities((current) => ({
          ...current,
          ...Object.fromEntries(cards.map((card) => [card.id, card])),
        }));
      },
      (loadError) => {
        console.error('[PromptFund Firestore] read failure', {
          path: founderCardsPath,
          operation: 'onSnapshot',
          error: loadError,
        });
        setNotice(getFriendlyErrorMessage(loadError));
      },
    );

    return unsubscribe;
  }, [authUser, isFounderMode]);

  async function handleAcceptInterest(interest: InvestmentInterest) {
    const opportunity = opportunities[interest.startupId];
    if (!profile || !opportunity) {
      setNotice('Unable to load Startup opportunity for this Interest.');
      return;
    }

    try {
      console.log('FOUNDER ACCEPT INTEREST START', {
        founderId: profile.id,
        investorId: interest.investorId,
        startupOpportunityId: interest.startupId,
      });
      console.log('[ACCEPT FLOW]', {
        collection: 'users',
        path: `users/${interest.investorId}`,
        operation: 'getDoc',
        currentUid: authUser?.uid ?? null,
      });
      const investor = await userService.getUserById(interest.investorId);
      const { room } = await investmentFlowService.acceptInterestAndCreateDiscussion({
        interest,
        opportunity,
        founderName: profile.displayName ?? profile.name,
        investorName: investor?.displayName ?? investor?.name ?? 'Angel Investor',
      });
      console.log('FOUNDER ACCEPT DISCUSSION ROOM READY', {
        founderId: profile.id,
        investorId: interest.investorId,
        roomId: room.id,
      });
      router.push(`/discussion-room/${room.id}`);
    } catch (acceptError) {
      setNotice(getFriendlyErrorMessage(acceptError));
    }
  }

  async function handleOpenMatch(match: Match) {
    const opportunity = opportunities[match.startupId];
    if (!profile || !opportunity) {
      setNotice('Unable to load Startup opportunity for this Match.');
      return;
    }

    try {
      const investor = await userService.getUserById(match.investorUid);
      const founder = await userService.getUserById(match.founderUid);
      const room = await investmentFlowService.ensureDiscussionForMatch({
        match,
        opportunity,
        founderName: founder?.displayName ?? founder?.name ?? opportunity.founderName,
        investorName: investor?.displayName ?? investor?.name ?? 'Angel Investor',
      });
      router.push(`/discussion-room/${room.id}`);
    } catch (matchError) {
      setNotice(getFriendlyErrorMessage(matchError));
    }
  }

  return (
    <Screen
      eyebrow="My Cards"
      title="Deal Pipeline"
      subtitle={
        isFounderMode
          ? 'Track each startup once from Interest Received through Deal Completed.'
          : 'Track every startup deal once from Interest Shown through completion.'
      }
    >
      {isLoading ? <LoadingState label="Loading My Cards" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      <View style={ui.row}>
        <StatCard label="Completed Deals" value={`${archivedCount} Deals`} tone={colors.luxuryGold} />
        <StatCard label="Total Capital Completed" value={safeCurrency(completedCapital || totalFunding)} tone={colors.success} />
      </View>
      <View style={ui.row}>
        <StatCard label="Active deals" value={String(activePipelines.length)} tone={colors.accent} />
      </View>

      {archivedCount > 0 ? (
        <Card style={styles.archiveCard}>
          <Text style={styles.sectionTitle}>Traction</Text>
          <Text style={styles.meta}>Funded startups become permanent portfolio companies in Traction.</Text>
          <PrimaryButton label="Open Traction >" variant="secondary" onPress={() => router.push('/traction')} />
        </Card>
      ) : null}

      {!isLoading && activePipelines.length === 0 ? (
        <EmptyState
          title={isFounderMode ? 'No active deal pipeline yet.' : 'No active cards yet.'}
          message={
            isFounderMode
              ? 'Incoming Angel Investor Interest appears here after they swipe right.'
              : 'Swipe right in Fundraising to add Startup opportunities to My Cards.'
          }
          action={
            isFounderMode ? (
              <PrimaryLink href="/projects/create" label="Publish Startup Opportunity" />
            ) : (
              <PrimaryLink href="/investor-feed" label="Open Fundraising Deck" />
            )
          }
        />
      ) : null}

      {!isLoading && activePipelines.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>Active Deal Pipeline</Text>
          {activePipelines.map((pipeline) => (
            <DealPipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              founderMode={isFounderMode}
              onAcceptInterest={pipeline.interest ? () => handleAcceptInterest(pipeline.interest as InvestmentInterest) : undefined}
              onOpenMatch={pipeline.match ? () => handleOpenMatch(pipeline.match as Match) : undefined}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function DealPipelineCard({
  pipeline,
  founderMode,
  onAcceptInterest,
  onOpenMatch,
}: {
  pipeline: DealPipeline;
  founderMode: boolean;
  onAcceptInterest?: () => void;
  onOpenMatch?: () => void;
}) {
  const opportunity = pipeline.opportunity;
  const title = opportunity?.startupName
    ?? pipeline.agreement?.startupName
    ?? pipeline.room?.startupName
    ?? pipeline.investment?.startupName
    ?? 'Startup Opportunity';
  const founderName = opportunity?.founderName
    ?? pipeline.agreement?.founderName
    ?? pipeline.room?.founderName
    ?? pipeline.investment?.founderName
    ?? 'Founder';
  const investorName = pipeline.agreement?.investorName
    ?? pipeline.room?.investorName
    ?? pipeline.investment?.investorName
    ?? 'Angel Investor';
  const amount = pipeline.agreement?.investmentAmount
    ?? pipeline.room?.investmentAmount
    ?? pipeline.investment?.amount
    ?? opportunity?.fundingNeeded;
  const allocation = pipeline.agreement?.investorAllocation
    ?? pipeline.room?.investorAllocation
    ?? pipeline.investment?.allocation
    ?? opportunity?.investorAllocation;
  const stageMeta = getPipelineStageMeta(pipeline);

  return (
    <Card style={styles.pipelineCard}>
      <View style={styles.rowHeader}>
        <View style={styles.pipelineTitleBlock}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.meta}>Founder: {founderName}</Text>
          {!founderMode ? <Text style={styles.meta}>Investor: {investorName}</Text> : null}
        </View>
        <View style={[styles.stageBadge, { borderColor: stageMeta.badgeColor }]}>
          <Text style={[styles.stageBadgeText, { color: stageMeta.badgeColor }]}>{stageMeta.badge}</Text>
        </View>
      </View>

      {opportunity ? (
        <View style={styles.playingCardWrap}>
          <StartupPlayingCard card={mapOpportunityToStartupCard(opportunity)} compact />
        </View>
      ) : null}

      <View style={styles.detailGrid}>
        <Detail label="Founder" value={founderName} />
        <Detail label="Amount" value={safeCurrency(amount)} />
        <Detail label="Allocation" value={safePercent(allocation)} />
      </View>

      <View style={styles.timeline}>
        {pipelineSteps.map((step, index) => {
          const isCompleted = pipeline.completedSteps[step.key];
          const isCurrent = pipeline.currentStep === step.key;

          return (
            <View key={step.key} style={styles.timelineRow}>
              <View style={[
                styles.timelineMarker,
                isCompleted ? styles.timelineMarkerDone : null,
                isCurrent ? styles.timelineMarkerCurrent : null,
              ]}>
                <Text style={styles.timelineMarkerText}>{isCompleted ? '✓' : index + 1}</Text>
              </View>
              <View style={styles.timelineTextBlock}>
                <Text style={[
                  styles.timelineLabel,
                  isCompleted ? styles.timelineDone : null,
                  isCurrent ? styles.timelineCurrent : null,
                ]}>
                  {step.label}
                </Text>
                <Text style={styles.timelineState}>
                  {isCompleted ? 'Completed' : isCurrent ? 'Current step' : 'Not started'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <PipelineAction
        pipeline={pipeline}
        founderMode={founderMode}
        onAcceptInterest={onAcceptInterest}
        onOpenMatch={onOpenMatch}
      />
    </Card>
  );
}

function PipelineAction({
  pipeline,
  founderMode,
  onAcceptInterest,
  onOpenMatch,
}: {
  pipeline: DealPipeline;
  founderMode: boolean;
  onAcceptInterest?: () => void;
  onOpenMatch?: () => void;
}) {
  if (founderMode && pipeline.interest && !pipeline.room) {
    return (
      <PrimaryButton
        label="Accept Interest & Start Discussion"
        onPress={onAcceptInterest ?? (() => undefined)}
        disabled={!onAcceptInterest}
      />
    );
  }

  if (pipeline.room && !pipeline.agreement) {
    return <PrimaryButton label="Open Discussion Room" onPress={() => router.push(`/discussion-room/${pipeline.room?.id}`)} />;
  }

  if (pipeline.agreement) {
    const isFundingStage = ['awaiting_funding', 'funding_arranged', 'completed'].includes(pipeline.agreement.status);
    return (
      <PrimaryButton
        label={isFundingStage ? 'Open Funding Instructions' : 'Open Agreement'}
        onPress={() => router.push(isFundingStage ? `/payment/${pipeline.agreement?.id}` : `/agreement/${pipeline.agreement?.id}`)}
      />
    );
  }

  if (pipeline.match) {
    return <PrimaryButton label="Open Match" onPress={onOpenMatch ?? (() => undefined)} disabled={!onOpenMatch} />;
  }

  return <Text style={styles.meta}>Waiting for the next deal step.</Text>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function mapStartupInterestToLegacy(interest: StartupInterest): InvestmentInterest {
  return {
    id: interest.id,
    startupId: interest.startupOpportunityId,
    investorId: interest.investorId,
    founderUid: interest.founderId,
    createdAt: interest.createdAt,
    status: interest.status === 'discussion' ? 'accepted' : interest.status,
  };
}

function mapOpportunityToStartupCard(opportunity: InvestmentOpportunity): StartupCard {
  const title = opportunity.title ?? opportunity.startupName;
  const description = opportunity.description ?? opportunity.shortDescription ?? opportunity.purpose;
  const askAmount = opportunity.askAmount ?? opportunity.fundingGoal ?? opportunity.fundingNeeded;
  const equity = opportunity.equity ?? opportunity.investorAllocation;

  const card: StartupCard = {
    id: opportunity.id,
    developerId: opportunity.founderId,
    ownerId: opportunity.founderId,
    title,
    startupName: title,
    shortDescription: opportunity.shortDescription ?? description,
    tagline: description,
    description,
    fundingNeeded: opportunity.fundingNeeded ?? askAmount,
    goalAmount: askAmount,
    equityOffered: equity,
    metric: '$22 angel check',
    founderName: opportunity.founderName,
    founderAvatar: opportunity.founderName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'PF',
    founderVerified: true,
    rank: 'A' as const,
    coverImage: opportunity.imageUrl,
    stage: opportunity.stage,
    shortPitch: description,
  };

  console.log('[My Cards] mapped startup card before render', {
    source: {
      startupName: opportunity.startupName,
      founderName: opportunity.founderName,
      shortDescription: opportunity.shortDescription,
      fundingNeeded: opportunity.fundingNeeded,
      imageUrl: opportunity.imageUrl,
    },
    card,
  });

  return card;
}

const styles = StyleSheet.create({
  notice: {
    color: colors.text,
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
  archiveCard: {
    gap: spacing.sm,
  },
  pipelineCard: {
    gap: spacing.md,
  },
  pipelineTitleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  playingCardWrap: {
    alignSelf: 'center',
    width: 180,
  },
  rowHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  cardTitle: {
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
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  stageBadge: {
    maxWidth: 172,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 16,
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
  timeline: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.18)',
    borderRadius: 20,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.black,
  },
  timelineMarkerDone: {
    borderColor: colors.success,
    backgroundColor: 'rgba(46, 125, 50, 0.24)',
  },
  timelineMarkerCurrent: {
    borderColor: colors.luxuryGold,
    backgroundColor: 'rgba(200, 162, 74, 0.18)',
  },
  timelineMarkerText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  timelineTextBlock: {
    flex: 1,
  },
  timelineLabel: {
    color: colors.subtle,
    fontSize: 15,
    fontWeight: '900',
  },
  timelineDone: {
    color: colors.success,
  },
  timelineCurrent: {
    color: colors.luxuryGold,
  },
  timelineState: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
});
