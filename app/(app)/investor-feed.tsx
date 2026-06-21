import { useEffect, useMemo, useState } from 'react';
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
  mapProjectToStartupCard,
  sampleStartupCards,
  type StartupCard,
} from '@/components/cards/StartupPlayingCard';
import {
  EmptyState,
  LoadingState,
  Pill,
  PrimaryButton,
  PrimaryLink,
  Screen,
} from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fundingService } from '@/services/fundingService';
import { projectService } from '@/services/projectService';
import type { Project } from '@/types/Project';
import { getRoleBadgeLabel } from '@/utils/roles';

export default function InvestorFeedScreen() {
  const { authUser, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInterested, setIsInterested] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const cards = useMemo<StartupCard[]>(() => {
    const projectCards = projects.map(mapProjectToStartupCard);
    return projectCards.length > 0 ? projectCards : sampleStartupCards;
  }, [projects]);
  const activeCard = cards[activeIndex % cards.length];
  const nextCard = cards[(activeIndex + 1) % cards.length];
  const thirdCard = cards[(activeIndex + 2) % cards.length];

  useEffect(() => {
    async function loadDiscoverCards() {
      setIsLoading(true);

      try {
        setProjects(await projectService.listProjects());
      } finally {
        setIsLoading(false);
      }
    }

    loadDiscoverCards();
  }, []);

  async function handleSwipeComplete(direction: 'left' | 'right') {
    if (!activeCard) {
      return;
    }

    setShowBack(false);
    setActiveIndex((index) => index + 1);

    if (direction === 'left') {
      setNotice('Passed.');
      return;
    }

    setNotice('Interested sent.');
    setIsInterested(true);

    if (authUser && !activeCard.isSample && activeCard.ownerId) {
      try {
        await fundingService.createInvestmentInterest({
          startupId: activeCard.id,
          investorId: authUser.uid,
          founderUid: activeCard.ownerId,
        });
      } catch (interestError) {
        setNotice(interestError instanceof Error ? interestError.message : 'Unable to send interest.');
      } finally {
        setIsInterested(false);
      }
    } else {
      setIsInterested(false);
    }
  }

  return (
    <Screen
      eyebrow="Discover"
      title="Discover startups."
      subtitle="Review investment opportunities with a swipe."
    >
      {profile ? <Pill label={getRoleBadgeLabel(profile.role)} tone="rgba(200,162,74,0.18)" /> : null}
      {isLoading ? <LoadingState label="Loading cards" /> : null}

      {!isLoading && !activeCard ? (
        <EmptyState
          title="No cards in the deck"
          message="Founders can publish a card in under 60 seconds."
          action={<PrimaryLink href="/projects/create" label="Create Your Card" />}
        />
      ) : null}

      {!isLoading && activeCard ? (
        <>
          {notice ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          <SwipeCardStack
            activeCard={activeCard}
            nextCard={nextCard}
            thirdCard={thirdCard}
            showBack={showBack}
            onToggleBack={() => setShowBack((value) => !value)}
            onSwipeComplete={handleSwipeComplete}
          />

          <View style={styles.actionRow}>
            <PrimaryButton label="Pass" variant="secondary" onPress={() => handleSwipeComplete('left')} />
            <PrimaryButton
              label={isInterested ? 'Sending...' : 'Interested'}
              disabled={isInterested}
              onPress={() => handleSwipeComplete('right')}
            />
          </View>
          <Text style={styles.hint}>Swipe left to pass. Swipe right to show interest. Tap to flip.</Text>
        </>
      ) : null}
    </Screen>
  );
}

function SwipeCardStack({
  activeCard,
  nextCard,
  thirdCard,
  showBack,
  onToggleBack,
  onSwipeComplete,
}: {
  activeCard: StartupCard;
  nextCard?: StartupCard;
  thirdCard?: StartupCard;
  showBack: boolean;
  onToggleBack: () => void;
  onSwipeComplete: (direction: 'left' | 'right') => void;
}) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const threshold = Math.min(width * 0.28, 132);
  const exitDistance = width + 160;

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [activeCard.id, translateX, translateY]);

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

  const tapGesture = Gesture.Tap().maxDuration(180).onEnd(() => {
    runOnJS(onToggleBack)();
  });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

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

  const backCardStyle = useAnimatedStyle(() => {
    const scale = interpolate(Math.abs(translateX.value), [0, threshold], [0.94, 0.98], Extrapolation.CLAMP);
    const offset = interpolate(Math.abs(translateX.value), [0, threshold], [22, 10], Extrapolation.CLAMP);

    return {
      transform: [{ translateY: offset }, { scale }],
    };
  });

  return (
    <View style={styles.stackStage}>
      {thirdCard ? (
        <View style={[styles.cardStage, styles.thirdCard]}>
          <StartupPlayingCard card={thirdCard} />
        </View>
      ) : null}
      {nextCard ? (
        <Animated.View style={[styles.cardStage, styles.backCard, backCardStyle]}>
          <StartupPlayingCard card={nextCard} />
        </Animated.View>
      ) : null}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.cardStage, styles.activeCard, activeStyle]}>
          <Animated.View style={[styles.badge, styles.likeBadge, likeBadgeStyle]}>
            <Text style={[styles.badgeText, styles.likeText]}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.passBadge, passBadgeStyle]}>
            <Text style={[styles.badgeText, styles.passText]}>PASS</Text>
          </Animated.View>
          <StartupPlayingCard card={activeCard} showBack={showBack} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.5)',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(46, 125, 50, 0.14)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900',
  },
  stackStage: {
    alignSelf: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 380,
    minHeight: 540,
  },
  cardStage: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
  },
  activeCard: {
    zIndex: 3,
  },
  backCard: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 2,
    opacity: 0.78,
  },
  thirdCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1,
    opacity: 0.38,
    transform: [{ translateY: 40 }, { scale: 0.9 }],
  },
  badge: {
    position: 'absolute',
    top: 64,
    zIndex: 6,
    borderWidth: 4,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  likeBadge: {
    left: 28,
    borderColor: colors.success,
  },
  passBadge: {
    right: 28,
    borderColor: colors.pokerRed,
  },
  badgeText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
  likeText: {
    color: colors.success,
  },
  passText: {
    color: colors.pokerRed,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
