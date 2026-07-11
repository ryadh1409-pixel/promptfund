import { router } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StartupDetailCard } from '@/components/cards/StartupDetailCard';
import { mapOpportunityToStartupCard } from '@/components/cards/StartupPlayingCard';
import { Card, EmptyState, LoadingState, PrimaryButton, PrimaryLink, Screen } from '@/components/ui/Primitives';
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
  getPipelineDiscussionRoomId,
  getPipelineStageMeta,
  splitPipelinesByActivity,
  type DealPipeline,
  type OpportunityMap,
} from '@/utils/investmentPipeline';
import { filterVisiblePipelines } from '@/utils/dealPipelineVisibility';
import { getActiveRole } from '@/utils/roles';

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
  const requestedOpportunityIdsRef = useRef<Set<string>>(new Set());

  const dealPipelines = useMemo(
    () => filterVisiblePipelines(buildDealPipelines({
      founderCards: founderCards.filter((card) => card.status !== 'archived' && card.status !== 'deleted'),
      interests: interests.filter((interest) => interest.status !== 'expired'),
      matches: matches.filter((match) => {
        const linkedInterest = interests.find((interest) => (
          interest.startupId === match.startupId
          && interest.investorId === match.investorUid
        ));
        return linkedInterest?.status !== 'expired';
      }),
      discussionRooms: discussionRooms.filter((room) => room.status !== 'archived'),
      agreements,
      investments,
      opportunities,
      includeFounderCards: isFounderMode,
    })),
    [agreements, discussionRooms, founderCards, interests, investments, isFounderMode, matches, opportunities],
  );
  const { activePipelines } = useMemo(() => splitPipelinesByActivity(dealPipelines), [dealPipelines]);

  useEffect(() => {
    if (!authUser?.uid) {
      setIsLoading(false);
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

    const unsubscribeInterests = onSnapshot(interestsQuery, (snapshot) => {
      setInterests((current) => updateIfChanged(current, snapshot.docs.map((item) => mapStartupInterestToLegacy({ ...item.data(), id: item.id } as StartupInterest))));
      setIsLoading(false);
    }, (error) => {
      console.error('[PromptFund Firestore] read failure', { path: 'interests', operation: 'onSnapshot', error });
      setNotice(getFriendlyErrorMessage(error));
      setIsLoading(false);
    });
    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
      setMatches((current) => updateIfChanged(current, snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Match)));
      setIsLoading(false);
    }, (error) => {
      console.error('[PromptFund Firestore] read failure', { path: 'matches', operation: 'onSnapshot', error });
      setNotice(getFriendlyErrorMessage(error));
      setIsLoading(false);
    });
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      setDiscussionRooms((current) => updateIfChanged(current, snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as DiscussionRoom)));
      setIsLoading(false);
    }, (error) => {
      console.error('[PromptFund Firestore] read failure', { path: 'discussionRooms', operation: 'onSnapshot', error });
      setNotice(getFriendlyErrorMessage(error));
      setIsLoading(false);
    });
    const unsubscribeInvestments = onSnapshot(investmentsQuery, (snapshot) => {
      setInvestments((current) => updateIfChanged(current, snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as V5Investment)));
      setIsLoading(false);
    }, (error) => {
      console.error('[PromptFund Firestore] read failure', { path: 'investments', operation: 'onSnapshot', error });
      setNotice(getFriendlyErrorMessage(error));
      setIsLoading(false);
    });
    const unsubscribeAgreements = onSnapshot(agreementsQuery, (snapshot) => {
      setAgreements((current) => updateIfChanged(current, snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as InvestmentAgreement)));
      setIsLoading(false);
    }, (error) => {
      console.error('[PromptFund Firestore] read failure', { path: 'agreements', operation: 'onSnapshot', error });
      setNotice(getFriendlyErrorMessage(error));
      setIsLoading(false);
    });

    return () => {
      unsubscribeInterests();
      unsubscribeMatches();
      unsubscribeRooms();
      unsubscribeInvestments();
      unsubscribeAgreements();
    };
  }, [authUser?.uid, isFounderMode]);

  useEffect(() => {
    if (!authUser?.uid || !isFounderMode) {
      setFounderCards((current) => current.length === 0 ? current : []);
      setIsLoading(false);
      return;
    }

    const founderCardsQuery = query(
      collection(getPromptFundFirestore(), 'startupOpportunities'),
      where('founderId', '==', authUser.uid),
    );

    const unsubscribe = onSnapshot(
      founderCardsQuery,
      (snapshot) => {
        const cards = snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as InvestmentOpportunity)
          .filter((card) => card.status !== 'archived' && card.status !== 'deleted');
        setFounderCards((current) => updateIfChanged(current, cards));
        setOpportunities((current) => {
          const next = { ...current, ...Object.fromEntries(cards.map((card) => [card.id, card])) };
          return stableStringify(current) === stableStringify(next) ? current : next;
        });
        setIsLoading(false);
      },
      (loadError) => {
        console.error('[PromptFund Firestore] read failure', {
          path: 'startupOpportunities',
          operation: 'onSnapshot',
          error: loadError,
        });
        setNotice(getFriendlyErrorMessage(loadError));
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [authUser?.uid, isFounderMode]);

  const missingOpportunityIds = useMemo(() => Array.from(new Set([
    ...interests.map((interest) => interest.startupId),
    ...matches.map((match) => match.startupId),
    ...discussionRooms.map((room) => room.opportunityId),
    ...agreements.map((agreement) => agreement.opportunityId),
    ...investments.map((investment) => investment.opportunityId).filter((opportunityId): opportunityId is string => Boolean(opportunityId)),
  ])).filter((startupId) => !opportunities[startupId]), [agreements, discussionRooms, interests, investments, matches, opportunities]);

  useEffect(() => {
    requestedOpportunityIdsRef.current = new Set();
  }, [authUser?.uid, isFounderMode]);

  useEffect(() => {
    if (missingOpportunityIds.length === 0) {
      return;
    }

    const idsToLoad = missingOpportunityIds.filter((startupId) => !requestedOpportunityIdsRef.current.has(startupId));
    if (idsToLoad.length === 0) {
      return;
    }

    idsToLoad.forEach((startupId) => requestedOpportunityIdsRef.current.add(startupId));
    let isMounted = true;
    Promise.all(
      idsToLoad.map(async (startupId) => {
        const opportunity = await investmentFlowService.getOpportunity(startupId);
        return opportunity ? [startupId, opportunity] as const : null;
      }),
    )
      .then((entries) => {
        if (!isMounted) {
          return;
        }

        const nextEntries = entries.filter((entry): entry is readonly [string, InvestmentOpportunity] => entry !== null);
        if (nextEntries.length === 0) {
          return;
        }

        setOpportunities((current) => {
          const next = { ...current, ...Object.fromEntries(nextEntries) };
          return stableStringify(current) === stableStringify(next) ? current : next;
        });
      })
      .catch((loadError) => setNotice(getFriendlyErrorMessage(loadError)));

    return () => {
      isMounted = false;
    };
  }, [missingOpportunityIds]);

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

  const handleOpenDeal = useCallback((pipeline: DealPipeline) => {
    const chatRoomId = getPipelineDiscussionRoomId(pipeline);
    if (chatRoomId) {
      router.push(`/discussion-room/${chatRoomId}`);
      return;
    }

    if (pipeline.match) {
      void handleOpenMatch(pipeline.match);
      return;
    }

    if (isFounderMode && pipeline.interest) {
      void handleAcceptInterest(pipeline.interest);
    }
  }, [handleAcceptInterest, handleOpenMatch, isFounderMode]);

  const renderedCards = useMemo(() => activePipelines.map((pipeline) => (
    <MyCardsStartupCard
      key={pipeline.id}
      pipeline={pipeline}
      onOpen={() => handleOpenDeal(pipeline)}
    />
  )), [activePipelines, handleOpenDeal]);

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
        <View style={styles.cardList}>
          {renderedCards}
        </View>
      ) : null}
    </Screen>
  );
}

const MyCardsStartupCard = memo(function MyCardsStartupCard({
  pipeline,
  onOpen,
}: {
  pipeline: DealPipeline;
  onOpen: () => void;
}) {
  const opportunity = pipeline.opportunity;
  const stageMeta = getPipelineStageMeta(pipeline);
  const startupCard = useMemo(
    () => (opportunity ? mapOpportunityToStartupCard(opportunity) : null),
    [opportunity],
  );

  if (!startupCard) {
    return null;
  }

  return (
    <Card style={styles.cardItem}>
      <StartupDetailCard card={startupCard} stageLabel={stageMeta.label} />
      <PrimaryButton label="Open" onPress={onOpen} />
    </Card>
  );
});

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

function updateIfChanged<T>(current: T, next: T) {
  return stableStringify(current) === stableStringify(next) ? current : next;
}

function stableStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const styles = StyleSheet.create({
  notice: {
    color: colors.text,
    lineHeight: 22,
  },
  cardList: {
    gap: spacing.md,
  },
  cardItem: {
    gap: spacing.md,
  },
});
