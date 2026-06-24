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
import { getActiveRole } from '@/utils/roles';
import { safeCurrency, safeDate, safePercent } from '@/utils/safeFormat';

type OpportunityMap = Record<string, InvestmentOpportunity>;

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
  const shownInterests = interests;
  const readyAgreements = agreements.filter((agreement) =>
    ['agreement_pending', 'awaiting_funding', 'investor_sent', 'funded'].includes(agreement.status),
  );

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
      title={isFounderMode ? 'Founder cards.' : 'Investor cards.'}
      subtitle={
        isFounderMode
          ? 'Accept Interest, create Matches, and receive Funding.'
          : 'Track Interests, Matches, Investment Discussion Rooms, and Active Investments.'
      }
    >
      {isLoading ? <LoadingState label="Loading My Cards" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      <View style={ui.row}>
        <StatCard label={isFounderMode ? 'Funding Received' : 'Invested'} value={`${safeCurrency(totalFunding)} USD`} tone={colors.luxuryGold} />
        <StatCard label="Matches" value={String(matches.length)} tone={colors.accent} />
      </View>

      {!isLoading && founderCards.length === 0 && shownInterests.length === 0 && matches.length === 0 && discussionRooms.length === 0 && readyAgreements.length === 0 && investments.length === 0 ? (
        <EmptyState
          title={isFounderMode ? 'No investor Interest yet.' : 'No cards yet.'}
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

      {!isLoading && isFounderMode && founderCards.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>Own Startup Cards</Text>
          {founderCards.map((card) => (
            <FounderCard key={card.id} opportunity={card} />
          ))}
        </View>
      ) : null}

      {!isLoading && shownInterests.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>Interests</Text>
          {shownInterests.map((interest) => (
            <InterestCard
              key={interest.id}
              interest={interest}
              opportunity={opportunities[interest.startupId]}
              founderMode={isFounderMode}
              onAccept={() => handleAcceptInterest(interest)}
            />
          ))}
        </View>
      ) : null}

      {!isLoading && matches.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>Matches</Text>
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              opportunity={opportunities[match.startupId]}
              onOpen={() => handleOpenMatch(match)}
            />
          ))}
        </View>
      ) : null}

      {!isLoading && discussionRooms.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>Discussion Rooms</Text>
          {discussionRooms.map((room) => (
            <DiscussionRoomCard key={room.id} room={room} onOpen={() => router.push(`/discussion-room/${room.id}`)} />
          ))}
        </View>
      ) : null}

      {!isLoading && readyAgreements.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>Ready Agreements</Text>
          {readyAgreements.map((agreement) => (
            <AgreementCard key={agreement.id} agreement={agreement} />
          ))}
        </View>
      ) : null}

      {!isLoading && investments.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>{isFounderMode ? 'Funding Received' : 'Investment Active'}</Text>
          {investments.map((investment) => (
            <InvestmentRow key={investment.id} investment={investment} founderMode={isFounderMode} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function FounderCard({ opportunity }: { opportunity: InvestmentOpportunity }) {
  return (
    <Card style={styles.compactCard}>
      <Text style={styles.cardTitle}>{opportunity.title ?? opportunity.startupName}</Text>
      <Text style={styles.meta}>Status: {opportunity.status}</Text>
      <View style={styles.playingCardWrap}>
        <StartupPlayingCard card={mapOpportunityToStartupCard(opportunity)} compact />
      </View>
    </Card>
  );
}

function InterestCard({
  interest,
  opportunity,
  founderMode,
  onAccept,
}: {
  interest: InvestmentInterest;
  opportunity?: InvestmentOpportunity;
  founderMode: boolean;
  onAccept: () => void;
}) {
  return (
    <Card style={styles.compactCard}>
      <Text style={styles.cardTitle}>{opportunity?.startupName ?? 'Startup Opportunity'}</Text>
      <Text style={styles.meta}>Interest shown on {safeDate(interest.createdAt)}</Text>
      {opportunity ? (
        <View style={styles.playingCardWrap}>
          <StartupPlayingCard card={mapOpportunityToStartupCard(opportunity)} compact />
        </View>
      ) : null}
      {founderMode ? <PrimaryButton label="Accept Interest & Start Discussion" onPress={onAccept} /> : null}
    </Card>
  );
}

function MatchCard({
  match,
  opportunity,
  onOpen,
}: {
  match: Match;
  opportunity?: InvestmentOpportunity;
  onOpen: () => void;
}) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{opportunity?.startupName ?? 'Matched Startup'}</Text>
      <Text style={styles.meta}>Match created on {safeDate(match.matchedAt)}</Text>
      <PrimaryButton label="Start Discussion" onPress={onOpen} />
    </Card>
  );
}

function DiscussionRoomCard({ room, onOpen }: { room: DiscussionRoom; onOpen: () => void }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{room.startupName}</Text>
      <Text style={styles.meta}>Founder: {room.founderName}</Text>
      <Text style={styles.meta}>Investor: {room.investorName}</Text>
      <Text style={styles.meta}>Status: {room.status}</Text>
      <PrimaryButton label="Open Discussion Room" onPress={onOpen} />
    </Card>
  );
}

function AgreementCard({ agreement }: { agreement: InvestmentAgreement }) {
  const isFundingStage = ['awaiting_funding', 'investor_sent', 'funded'].includes(agreement.status);

  return (
    <Card>
      <Text style={styles.cardTitle}>{agreement.startupName}</Text>
      <Text style={styles.meta}>Founder accepted: {agreement.founderAccepted ? 'Yes' : 'No'}</Text>
      <Text style={styles.meta}>Investor accepted: {agreement.investorAccepted ? 'Yes' : 'No'}</Text>
      <Text style={styles.meta}>Status: {agreement.status}</Text>
      <PrimaryButton
        label={isFundingStage ? 'Open Funding Instructions' : 'Open Agreement'}
        onPress={() => router.push(isFundingStage ? `/payment/${agreement.id}` : `/agreement/${agreement.id}`)}
      />
    </Card>
  );
}

function InvestmentRow({ investment, founderMode }: { investment: V5Investment; founderMode: boolean }) {
  const displayName = founderMode
    ? investment.investorName ?? 'Angel Investor'
    : investment.startupName ?? investment.note ?? 'Startup Investment';
  const meta = founderMode ? 'Funding Received' : `Founder: ${investment.founderName ?? 'Unknown'}`;

  return (
    <Card>
      <View style={styles.rowHeader}>
        <View>
          <Text style={styles.cardTitle}>{displayName}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        <Text style={styles.status}>{founderMode ? 'Funding Received' : 'Investment Active'}</Text>
      </View>
      <View style={styles.detailGrid}>
        <Detail label="Amount" value={`${safeCurrency(investment.amount)} USD`} />
        <Detail label="Allocation" value={safePercent(investment.allocation)} />
        <Detail label="Date" value={safeDate(investment.paidAt ?? investment.fundedAt ?? investment.createdAt)} />
        <Detail label="Status" value={founderMode ? 'Funding Received' : 'Investment Active'} />
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
  compactCard: {
    gap: spacing.md,
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
