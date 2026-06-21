import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  StartupPlayingCard,
  mapProjectToStartupCard,
  sampleStartupCards,
  type StartupCard,
} from '@/components/cards/StartupPlayingCard';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  PrimaryLink,
  Screen,
} from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fundingService } from '@/services/fundingService';
import { projectService } from '@/services/projectService';
import type { Project } from '@/types/Project';

export default function InvestorFeedScreen() {
  const router = useRouter();
  const { authUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInterested, setIsInterested] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const cards = useMemo<StartupCard[]>(() => {
    const projectCards = projects.map(mapProjectToStartupCard);
    return projectCards.length > 0 ? projectCards : sampleStartupCards;
  }, [projects]);
  const activeCard = cards[activeIndex % cards.length];
  const rotate = position.x.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: ['-10deg', '0deg', '10deg'],
  });
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

  function showNextCard(direction: 'left' | 'right') {
    Animated.timing(position, {
      toValue: { x: direction === 'right' ? 420 : -420, y: 28 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      setShowBack(false);
      setActiveIndex((index) => index + 1);
    });
  }

  function handlePass() {
    showNextCard('left');
  }

  async function handleInterested() {
    if (!activeCard) {
      return;
    }

    setIsInterested(true);
    try {
      if (authUser && !activeCard.isSample) {
        await fundingService.createInvestment({
          investorId: authUser.uid,
          projectId: activeCard.id,
          amount: Math.round(activeCard.goalAmount * 0.1),
          note: `Interested in ${activeCard.title}`,
        });
      }

      router.push({
        pathname: '/deals',
        params: {
          startup: activeCard.title,
          amount: String(Math.round(activeCard.goalAmount * 0.1)),
          equity: String(activeCard.equityOffered ?? 0),
          founder: activeCard.founderName ?? 'Founder',
        },
      });
      showNextCard('right');
    } finally {
      setIsInterested(false);
    }
  }

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12,
    onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
      useNativeDriver: false,
    }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 110) {
        handleInterested();
        return;
      }

      if (gesture.dx < -110) {
        handlePass();
        return;
      }

      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
    },
  });

  return (
    <Screen
      eyebrow="Discover"
      title="Swipe startup cards."
      subtitle="Discover. Swipe. Invest."
    >
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
          <Pressable accessibilityRole="button" onPress={() => setShowBack((value) => !value)}>
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.cardStage,
                {
                  transform: [
                    { translateX: position.x },
                    { translateY: position.y },
                    { rotate },
                  ],
                },
              ]}
            >
              <StartupPlayingCard card={activeCard} showBack={showBack} />
            </Animated.View>
          </Pressable>

          <View style={styles.actionRow}>
            <PrimaryButton label="Pass" variant="secondary" onPress={handlePass} />
            <PrimaryButton
              label={isInterested ? 'Opening Deal Table...' : 'Interested'}
              disabled={isInterested}
              onPress={handleInterested}
            />
          </View>
          <Text style={styles.hint}>Swipe left to pass. Swipe right to show interest. Tap to flip.</Text>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardStage: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
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
