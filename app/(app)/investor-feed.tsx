import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  StartupPlayingCard,
  type StartupCard,
} from '@/components/cards/StartupPlayingCard';
import { IdentityCard } from '@/components/cards/IdentityCard';
import { Card, EmptyState, LoadingState, Pill, PrimaryButton, PrimaryLink, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import { userService } from '@/services/userService';
import type { InvestmentOpportunity } from '@/types/InvestmentFlow';
import { getActiveRole, getRoleBadgeLabel } from '@/utils/roles';

const sampleInvestor = {
  id: 'investor-nova',
  fullName: 'Mira Khalid',
  username: 'mirakhalid',
  role: 'angel_investor' as const,
  avatar: 'MK',
  location: 'Toronto, Canada',
  bio: 'Angel investor backing AI, developer tools, and early product teams.',
  memberSince: '2026-06-01T00:00:00.000Z',
};

export default function FundraisingScreen() {
  const { authUser, profile } = useAuth();
  const activeRole = getActiveRole(profile);
  const isFounderMode = activeRole === 'founder';
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSavingInterest, setIsSavingInterest] = useState(false);

  const deck = useMemo(() => opportunities, [opportunities]);
  const activeOpportunity = deck.length > 0 ? deck[activeIndex % deck.length] : undefined;
  const nextOpportunity = deck.length > 1 ? deck[(activeIndex + 1) % deck.length] : undefined;
  const thirdOpportunity = deck.length > 2 ? deck[(activeIndex + 2) % deck.length] : undefined;

  useEffect(() => {
    setIsLoading(true);
    setNotice(null);

    console.info('[PromptFund Firestore] read start', {
      path: 'startupOpportunities/*',
      operation: 'onSnapshot',
    });
    const unsubscribe = onSnapshot(
      collection(getPromptFundFirestore(), 'startupOpportunities'),
      (snapshot) => {
        const loaded = snapshot.docs
          .map((item) => ({ ...item.data(), id: item.id }) as InvestmentOpportunity)
          .filter((opportunity) => {
            const isActive = opportunity.status === 'active' || opportunity.status === 'open';
            const isOwnCard = authUser ? opportunity.founderId === authUser.uid : false;
            return isActive && !isOwnCard;
          });

        console.log('Loaded opportunities', loaded.length);
        console.info('[PromptFund Firestore] read success', {
          path: 'startupOpportunities/*',
          operation: 'onSnapshot',
          count: snapshot.docs.length,
        });
        setOpportunities(loaded);
        setActiveIndex(0);
        setIsLoading(false);
      },
      (loadError) => {
        console.error('[PromptFund Firestore] read failure', {
          path: 'startupOpportunities/*',
          operation: 'onSnapshot',
          error: loadError,
        });
        setNotice(getFriendlyErrorMessage(loadError));
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [authUser]);

  async function handleSwipeComplete(direction: 'left' | 'right') {
    const swipedOpportunity = activeOpportunity;
    if (!swipedOpportunity) {
      return;
    }

    setActiveIndex((index) => index + 1);

    if (direction === 'left') {
      setNotice('Passed.');
      return;
    }

    if (!authUser || !profile) {
      setNotice('Sign in as an Angel Investor to show interest.');
      return;
    }

    if (swipedOpportunity.founderId === authUser.uid) {
      setNotice('Founders manage incoming Interests from My Cards.');
      return;
    }

    setIsSavingInterest(true);
    try {
      console.log('STEP 1: Interested button pressed');
      const interest = await investmentFlowService.createInterest({
        opportunity: swipedOpportunity,
        investorId: authUser.uid,
      });
      console.log('STEP 2: Interest created', interest.interestId);
      console.log('FOUNDER PROFILE FETCH START', swipedOpportunity.founderId);
      const founderProfile = await userService.getUserById(swipedOpportunity.founderId);
      console.log('FOUNDER PROFILE FETCH SUCCESS');
      const room = await investmentFlowService.createDiscussionRoomForInterest({
        interest,
        opportunity: {
          ...swipedOpportunity,
          founderName: founderProfile?.displayName ?? founderProfile?.name ?? swipedOpportunity.founderName,
        },
        investorName: profile.displayName ?? profile.name,
      });
      console.log('STEP 5: Navigating to room', room.id);
      router.push(`/discussion-room/${room.id}`);
      console.log('STEP 6: Navigation executed');
    } catch (interestError) {
      console.error('INTEREST FLOW ERROR', interestError);
      setNotice(getFriendlyErrorMessage(interestError));
    } finally {
      setIsSavingInterest(false);
    }
  }

  return (
    <Screen
      eyebrow="Fundraising"
      title={isFounderMode ? 'Your Startup is raising.' : 'Swipe startup opportunities.'}
      subtitle={
        isFounderMode
          ? 'Publish a Startup opportunity and review Angel Investor interest from My Cards.'
          : 'Swipe right to show Interest. Swipe left to pass. The card deck is the core PromptFund experience.'
      }
    >
      {profile ? <Pill label={getRoleBadgeLabel(profile.role)} tone="rgba(200,162,74,0.18)" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}
      {isLoading ? <LoadingState label="Loading fundraising deck" /> : null}

      {!isLoading && isFounderMode ? (
        <View style={styles.identityStage}>
          <IdentityCard {...sampleInvestor} />
          <Card>
            <Text style={styles.panelTitle}>Founder Flow</Text>
            <Text style={styles.panelCopy}>
              Angel Investors swipe your Startup opportunity. Accept Interest in My Cards to create a Match and
              open the Investment Discussion Room.
            </Text>
            <PrimaryLink href="/projects/create" label="Publish Startup Opportunity" />
          </Card>
        </View>
      ) : null}

      {!isLoading && !isFounderMode && deck.length === 0 ? (
        <EmptyState
          title="No startup opportunities yet."
          message="Founders can publish an opportunity in under 60 seconds."
          action={<PrimaryLink href="/projects/create" label="Create Startup Opportunity" />}
        />
      ) : null}

      {!isLoading && !isFounderMode && activeOpportunity ? (
        <>
          <SwipeDeck
            activeOpportunity={activeOpportunity}
            nextOpportunity={nextOpportunity}
            thirdOpportunity={thirdOpportunity}
            onSwipeComplete={handleSwipeComplete}
          />
          <View style={styles.actionRow}>
            <PrimaryButton label="Pass" variant="secondary" onPress={() => handleSwipeComplete('left')} />
            <PrimaryButton
              label={isSavingInterest ? 'Saving...' : 'Interested'}
              disabled={isSavingInterest}
              onPress={() => handleSwipeComplete('right')}
            />
          </View>
          <Text style={styles.hint}>Swipe right for Interest. PromptFund opens the Investment Discussion Room.</Text>
        </>
      ) : null}
    </Screen>
  );
}

function SwipeDeck({
  activeOpportunity,
  nextOpportunity,
  thirdOpportunity,
  onSwipeComplete,
}: {
  activeOpportunity: InvestmentOpportunity;
  nextOpportunity?: InvestmentOpportunity;
  thirdOpportunity?: InvestmentOpportunity;
  onSwipeComplete: (direction: 'left' | 'right') => void;
}) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const threshold = Math.min(width * 0.28, 132);
  const exitDistance = width + 180;

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [activeOpportunity.id, translateX, translateY]);

  function finishSwipe(direction: 'left' | 'right') {
    onSwipeComplete(direction);
  }

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationX > threshold) {
        translateX.value = withTiming(exitDistance, { duration: 220 }, () => {
          runOnJS(finishSwipe)('right');
        });
        translateY.value = withTiming(event.translationY + 36, { duration: 220 });
        return;
      }

      if (event.translationX < -threshold) {
        translateX.value = withTiming(-exitDistance, { duration: 220 }, () => {
          runOnJS(finishSwipe)('left');
        });
        translateY.value = withTiming(event.translationY + 36, { duration: 220 });
        return;
      }

      translateX.value = withSpring(0, { damping: 16, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 16, stiffness: 150 });
    });

  const activeStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-220, 0, 220], [-11, 0, 11], Extrapolation.CLAMP);

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [24, 120], [0, 1], Extrapolation.CLAMP),
    transform: [{ rotate: '-10deg' }],
  }));

  const passBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-120, -24], [1, 0], Extrapolation.CLAMP),
    transform: [{ rotate: '10deg' }],
  }));

  return (
    <View style={styles.deckStage}>
      {thirdOpportunity ? (
        <View style={[styles.deckCard, styles.thirdCard]}>
          <StartupPlayingCard card={mapOpportunityToStartupCard(thirdOpportunity)} />
        </View>
      ) : null}
      {nextOpportunity ? (
        <View style={[styles.deckCard, styles.nextCard]}>
          <StartupPlayingCard card={mapOpportunityToStartupCard(nextOpportunity)} />
        </View>
      ) : null}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.deckCard, activeStyle]}>
          <Animated.View style={[styles.swipeBadge, styles.likeBadge, likeBadgeStyle]}>
            <Text style={styles.likeText}>INTERESTED</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeBadge, styles.passBadge, passBadgeStyle]}>
            <Text style={styles.passText}>PASS</Text>
          </Animated.View>
          <StartupPlayingCard card={mapOpportunityToStartupCard(activeOpportunity)} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
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
    rank: 'A',
    coverImage: opportunity.imageUrl,
    stage: opportunity.stage,
    traction: description,
    shortPitch: description,
  };

  console.log('[Fundraising Deck] mapped startup card before render', {
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
  identityStage: {
    gap: spacing.md,
  },
  notice: {
    color: colors.text,
    lineHeight: 22,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  panelCopy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  deckStage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 560,
    marginTop: spacing.sm,
  },
  deckCard: {
    position: 'absolute',
    width: '92%',
    maxWidth: 390,
  },
  nextCard: {
    transform: [{ scale: 0.94 }, { translateY: 20 }],
    opacity: 0.74,
  },
  thirdCard: {
    transform: [{ scale: 0.88 }, { translateY: 38 }],
    opacity: 0.44,
  },
  swipeBadge: {
    position: 'absolute',
    top: 52,
    zIndex: 9,
    borderWidth: 3,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 252, 242, 0.86)',
  },
  likeBadge: {
    left: 36,
    borderColor: colors.success,
  },
  passBadge: {
    right: 36,
    borderColor: colors.pokerRed,
  },
  likeText: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  passText: {
    color: colors.pokerRed,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  hint: {
    color: colors.muted,
    textAlign: 'center',
  },
});
