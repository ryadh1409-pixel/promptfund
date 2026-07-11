import { router, useLocalSearchParams } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DealCancelButton } from '@/components/cards/DealCancelButton';
import { StartupDetailCard } from '@/components/cards/StartupDetailCard';
import { mapOpportunityToStartupCard } from '@/components/cards/StartupPlayingCard';
import { Card, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import { userService } from '@/services/userService';
import type { InvestmentInterest, Match } from '@/types/FundingRequest';
import type { DiscussionRoom, InvestmentAgreement, InvestmentOpportunity, StartupInterest, V5Investment } from '@/types/InvestmentFlow';
import { getPipelineStepDisplayState } from '@/utils/dealRoom';
import {
  buildDealPipelines,
  getPipelineDiscussionRoomId,
  getPipelineStageMeta,
  pipelineSteps,
  type DealPipeline,
  type OpportunityMap,
} from '@/utils/investmentPipeline';
import { filterVisiblePipelines } from '@/utils/dealPipelineVisibility';
import { getActiveRole } from '@/utils/roles';
import { safeCurrency, safePercent } from '@/utils/safeFormat';

export default function DealPipelineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authUser, profile } = useAuth();
  const activeRole = getActiveRole(profile);
  const isFounderMode = activeRole === 'founder';
  const opportunityId = typeof id === 'string' ? id : '';

  const [interests, setInterests] = useState<InvestmentInterest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [discussionRooms, setDiscussionRooms] = useState<DiscussionRoom[]>([]);
  const [agreements, setAgreements] = useState<InvestmentAgreement[]>([]);
  const [investments, setInvestments] = useState<V5Investment[]>([]);
  const [founderCards, setFounderCards] = useState<InvestmentOpportunity[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const requestedOpportunityRef = useRef(false);

  useEffect(() => {
    if (!authUser?.uid || !opportunityId) {
      setIsLoading(false);
      return;
    }

    const database = getPromptFundFirestore();
    const unsubscribes = [
      onSnapshot(
        query(collection(database, 'interests'), where(isFounderMode ? 'founderId' : 'investorId', '==', authUser.uid)),
        (snapshot) => {
          setInterests(snapshot.docs
            .map((item) => mapStartupInterestToLegacy({ ...item.data(), id: item.id } as StartupInterest))
            .filter((interest) => interest.startupId === opportunityId));
          setIsLoading(false);
        },
      ),
      onSnapshot(
        query(collection(database, 'matches'), where(isFounderMode ? 'founderUid' : 'investorUid', '==', authUser.uid)),
        (snapshot) => {
          setMatches(snapshot.docs
            .map((item) => ({ ...item.data(), id: item.id }) as Match)
            .filter((match) => match.startupId === opportunityId));
          setIsLoading(false);
        },
      ),
      onSnapshot(
        query(collection(database, 'discussionRooms'), where(isFounderMode ? 'founderId' : 'investorId', '==', authUser.uid)),
        (snapshot) => {
          setDiscussionRooms(snapshot.docs
            .map((item) => ({ ...item.data(), id: item.id }) as DiscussionRoom)
            .filter((room) => room.opportunityId === opportunityId));
          setIsLoading(false);
        },
      ),
      onSnapshot(
        query(collection(database, 'agreements'), where(isFounderMode ? 'founderId' : 'investorId', '==', authUser.uid)),
        (snapshot) => {
          setAgreements(snapshot.docs
            .map((item) => ({ ...item.data(), id: item.id }) as InvestmentAgreement)
            .filter((agreement) => agreement.opportunityId === opportunityId));
          setIsLoading(false);
        },
      ),
      onSnapshot(
        query(collection(database, 'investments'), where(isFounderMode ? 'founderId' : 'investorId', '==', authUser.uid)),
        (snapshot) => {
          setInvestments(snapshot.docs
            .map((item) => ({ ...item.data(), id: item.id }) as V5Investment)
            .filter((investment) => investment.opportunityId === opportunityId));
          setIsLoading(false);
        },
      ),
    ];

    if (isFounderMode) {
      unsubscribes.push(onSnapshot(
        query(collection(database, 'startupOpportunities'), where('founderId', '==', authUser.uid)),
        (snapshot) => {
          const cards = snapshot.docs
            .map((item) => ({ ...item.data(), id: item.id }) as InvestmentOpportunity)
            .filter((card) => card.id === opportunityId);
          setFounderCards(cards);
          setOpportunities((current) => {
            const next = { ...current, ...Object.fromEntries(cards.map((card) => [card.id, card])) };
            return next;
          });
          setIsLoading(false);
        },
      ));
    }

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [authUser?.uid, isFounderMode, opportunityId]);

  useEffect(() => {
    if (!opportunityId || opportunities[opportunityId] || requestedOpportunityRef.current) {
      return;
    }

    requestedOpportunityRef.current = true;
    investmentFlowService.getOpportunity(opportunityId)
      .then((opportunity) => {
        if (!opportunity) {
          return;
        }
        setOpportunities((current) => ({ ...current, [opportunity.id]: opportunity }));
      })
      .catch((error) => setNotice(getFriendlyErrorMessage(error)));
  }, [opportunities, opportunityId]);

  const pipeline = useMemo(() => {
    const pipelines = filterVisiblePipelines(buildDealPipelines({
      founderCards,
      interests,
      matches,
      discussionRooms,
      agreements,
      investments,
      opportunities,
      includeFounderCards: isFounderMode,
    }));
    return pipelines.find((item) => item.id === opportunityId) ?? null;
  }, [agreements, discussionRooms, founderCards, interests, investments, isFounderMode, matches, opportunities, opportunityId]);

  const handleAcceptInterest = useCallback(async (interest: InvestmentInterest) => {
    const opportunity = opportunities[interest.startupId];
    if (!profile || !opportunity) {
      setNotice('Unable to load Startup opportunity for this Interest.');
      return;
    }

    try {
      const investor = await userService.getUserById(interest.investorId);
      const { room } = await investmentFlowService.acceptInterestAndCreateDiscussion({
        interest,
        opportunity,
        founderName: profile.displayName ?? profile.name,
        investorName: investor?.displayName ?? investor?.name ?? 'Angel Investor',
      });
      router.push(`/discussion-room/${room.id}`);
    } catch (acceptError) {
      setNotice(getFriendlyErrorMessage(acceptError));
    }
  }, [opportunities, profile]);

  const handleOpenMatch = useCallback(async (match: Match) => {
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
  }, [opportunities, profile]);

  if (isLoading) {
    return (
      <Screen eyebrow="My Cards" title="Loading deal" subtitle="Opening startup details.">
        <LoadingState label="Loading deal details" />
      </Screen>
    );
  }

  if (!pipeline) {
    return (
      <Screen eyebrow="My Cards" title="Deal not found" subtitle="This startup card is no longer active.">
        <PrimaryButton label="Back to My Cards" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <DealPipelineDetailContent
      pipeline={pipeline}
      founderMode={isFounderMode}
      userId={authUser?.uid ?? ''}
      notice={notice}
      onNotice={setNotice}
      onAcceptInterest={handleAcceptInterest}
      onOpenMatch={handleOpenMatch}
      onCancelled={() => router.back()}
    />
  );
}

export function DealPipelineDetailContent({
  pipeline,
  founderMode,
  userId,
  notice,
  onNotice,
  onAcceptInterest,
  onOpenMatch,
  onCancelled,
}: {
  pipeline: DealPipeline;
  founderMode: boolean;
  userId: string;
  notice: string | null;
  onNotice: (message: string | null) => void;
  onAcceptInterest: (interest: InvestmentInterest) => void;
  onOpenMatch: (match: Match) => void;
  onCancelled?: () => void;
}) {
  const opportunity = pipeline.opportunity;
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
  const startupCard = opportunity ? mapOpportunityToStartupCard(opportunity) : null;
  const chatRoomId = getPipelineDiscussionRoomId(pipeline);

  return (
    <Screen
      eyebrow="My Cards"
      title={opportunity?.startupName ?? pipeline.room?.startupName ?? 'Startup Details'}
      subtitle="Full startup profile, deal progress, and next actions."
    >
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      {startupCard ? (
        <StartupDetailCard card={startupCard} stageLabel={stageMeta.label} />
      ) : null}

      <View style={styles.detailGrid}>
        <Detail label="Founder" value={founderName} />
        {!founderMode ? <Detail label="Investor" value={investorName} /> : null}
        <Detail label="Goal" value={safeCurrency(amount)} />
        <Detail label="Allocation" value={safePercent(allocation)} />
      </View>

      <Card style={styles.timelineCard}>
        <Text style={styles.sectionTitle}>Deal Progress</Text>
        <View style={styles.timeline}>
          {pipelineSteps.map((step, index) => {
            const { completed: isCompleted, isCurrent } = getPipelineStepDisplayState(pipeline, step.key);

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
      </Card>

      <DealCancelButton
        pipeline={pipeline}
        founderMode={founderMode}
        userId={userId}
        onCancelled={onCancelled}
        onError={onNotice}
      />

      {founderMode && pipeline.interest && !chatRoomId && !pipeline.match ? (
        <PrimaryButton
          label="Accept Interest & Start Investment Chat"
          onPress={() => onAcceptInterest(pipeline.interest as InvestmentInterest)}
        />
      ) : null}

      {chatRoomId ? (
        <PrimaryButton
          label="Open Deal Room"
          onPress={() => router.push(`/discussion-room/${chatRoomId}`)}
        />
      ) : null}

      {!chatRoomId && pipeline.match ? (
        <PrimaryButton
          label="Open Deal Room"
          onPress={() => onOpenMatch(pipeline.match as Match)}
        />
      ) : null}
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

const styles = StyleSheet.create({
  notice: {
    color: colors.text,
    lineHeight: 22,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detail: {
    backgroundColor: colors.black,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    minWidth: '47%',
    padding: spacing.md,
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
  timelineCard: {
    gap: spacing.md,
  },
  timeline: {
    gap: spacing.sm,
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineMarker: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  timelineMarkerDone: {
    backgroundColor: 'rgba(46, 125, 50, 0.24)',
    borderColor: colors.success,
  },
  timelineMarkerCurrent: {
    backgroundColor: 'rgba(200, 162, 74, 0.18)',
    borderColor: colors.luxuryGold,
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
