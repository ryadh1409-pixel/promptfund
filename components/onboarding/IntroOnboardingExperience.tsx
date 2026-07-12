import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark, PrimaryButton } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { markIntroOnboardingComplete } from '@/utils/introOnboarding';

const GRADIENT_STOPS = ['#8A5CFF', '#3B82F6', '#00D4FF', '#00F5A0'] as const;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type IntroScreen = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  highlights?: string[];
  illustration: 'welcome' | 'founder' | 'investor' | 'flow' | 'finale';
};

const INTRO_SCREENS: IntroScreen[] = [
  {
    id: 'welcome',
    title: 'Welcome to Ai PromptFund',
    subtitle: 'Every unicorn starts with one small step.',
    description:
      'Ai PromptFund connects startup founders with angel investors through a simple micro pre-seed fundraising model designed to help great ideas move forward.',
    illustration: 'welcome',
  },
  {
    id: 'founder',
    title: 'For Startup Founders',
    description:
      'Request a $22 USD Pre-Seed Contribution from an Angel Investor outside Ai PromptFund.\n\nUse this first contribution to validate your startup, build momentum, and begin your entrepreneurial journey.',
    highlights: ['$22 USD Pre-Seed', 'Outside App Funding', 'Startup Validation'],
    illustration: 'founder',
  },
  {
    id: 'investor',
    title: 'For Angel Investors',
    description:
      'Discover founders at the earliest stage.\n\nSupport promising entrepreneurs with a simple $22 USD pre-seed contribution made outside the app.\n\nHelp identify tomorrow\'s unicorns before everyone else.',
    highlights: ['Discover Founders', 'Early Access', 'Support Innovation'],
    illustration: 'investor',
  },
  {
    id: 'flow',
    title: 'Funding & Prompt Review',
    description:
      'Funding takes place outside Ai PromptFund between both parties.\n\nAfter the founder confirms receiving the $22 USD contribution, the founder submits the agreed AI Prompt or deliverable.\n\nThe investor can then review the prompt and provide a quality rating.',
    highlights: ['Funding Outside App', 'AI Prompt Submission', 'Investor Rating'],
    illustration: 'flow',
  },
  {
    id: 'finale',
    title: 'Every Unicorn Starts Somewhere',
    description:
      'Today\'s $22 USD may become tomorrow\'s unicorn.\n\nAi PromptFund believes every successful startup begins with its first believer.\n\nStart your pre-seed fundraising journey today.',
    illustration: 'finale',
  },
];

function GradientStrip() {
  return (
    <View style={styles.gradientStrip}>
      {GRADIENT_STOPS.map((stop) => (
        <View key={stop} style={[styles.gradientSegment, { backgroundColor: stop }]} />
      ))}
    </View>
  );
}

function IllustrationPanel({ variant }: { variant: IntroScreen['illustration'] }) {
  if (variant === 'welcome') {
    return (
      <View style={styles.illustrationFrame}>
        <View style={styles.glowOrbPrimary} />
        <View style={styles.glowOrbSecondary} />
        <GradientStrip />
        <Text style={styles.illustrationEmoji}>🦄</Text>
        <Text style={styles.illustrationCaption}>Startup momentum</Text>
      </View>
    );
  }

  if (variant === 'founder') {
    return (
      <View style={styles.illustrationFrame}>
        <View style={styles.glowOrbSecondary} />
        <Text style={styles.illustrationEmoji}>🚀</Text>
        <Text style={styles.illustrationCaption}>Founder presenting an idea</Text>
      </View>
    );
  }

  if (variant === 'investor') {
    return (
      <View style={styles.illustrationFrame}>
        <View style={styles.glowOrbPrimary} />
        <Text style={styles.illustrationEmoji}>💎</Text>
        <Text style={styles.illustrationCaption}>Angel investor supporting startup</Text>
      </View>
    );
  }

  if (variant === 'flow') {
    return (
      <View style={styles.illustrationFrame}>
        <View style={styles.flowRow}>
          <View style={styles.flowStep}>
            <Text style={styles.flowIcon}>💸</Text>
            <Text style={styles.flowLabel}>Funding</Text>
          </View>
          <Text style={styles.flowArrow}>→</Text>
          <View style={styles.flowStep}>
            <Text style={styles.flowIcon}>🤖</Text>
            <Text style={styles.flowLabel}>Prompt</Text>
          </View>
          <Text style={styles.flowArrow}>→</Text>
          <View style={styles.flowStep}>
            <Text style={styles.flowIcon}>⭐</Text>
            <Text style={styles.flowLabel}>Rating</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.illustrationFrame}>
      <View style={styles.glowOrbPrimary} />
      <View style={styles.glowOrbSecondary} />
      <Text style={styles.illustrationEmoji}>🌱</Text>
      <Text style={styles.illustrationCaption}>First believer. Future unicorn.</Text>
    </View>
  );
}

function HighlightCards({ items }: { items: string[] }) {
  return (
    <View style={styles.highlightList}>
      {items.map((item, index) => (
        <Animated.View
          key={item}
          entering={FadeInDown.delay(120 + index * 80).duration(420)}
          style={styles.highlightCard}
        >
          <View style={styles.highlightDot} />
          <Text style={styles.highlightText}>{item}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

function PageIndicators({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <View style={styles.indicatorRow}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={`indicator-${index}`}
          style={[
            styles.indicatorDot,
            index === activeIndex ? styles.indicatorDotActive : null,
          ]}
        />
      ))}
    </View>
  );
}

function OnboardingPage({ item, index }: { item: IntroScreen; index: number }) {
  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <ScrollView
        contentContainerStyle={styles.pageScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View entering={FadeIn.duration(360)} style={styles.pageInner}>
          <Animated.View entering={FadeInDown.delay(60).duration(420)}>
            <IllustrationPanel variant={item.illustration} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(420)} style={styles.copyBlock}>
            <Text style={styles.title}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
            <Text style={styles.description}>{item.description}</Text>
          </Animated.View>

          {item.highlights ? (
            <HighlightCards items={item.highlights} />
          ) : null}
        </Animated.View>
      </ScrollView>
      <Text style={styles.pageNumber}>{index + 1} / {INTRO_SCREENS.length}</Text>
    </View>
  );
}

export function IntroOnboardingExperience() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<IntroScreen>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastScreen = activeIndex === INTRO_SCREENS.length - 1;

  const finishOnboarding = useCallback(async () => {
    await markIntroOnboardingComplete();
    router.replace('/login');
  }, [router]);

  const goToIndex = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(index, INTRO_SCREENS.length - 1));
    setActiveIndex(nextIndex);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  }, []);

  const handleNext = useCallback(() => {
    if (isLastScreen) {
      void finishOnboarding();
      return;
    }
    goToIndex(activeIndex + 1);
  }, [activeIndex, finishOnboarding, goToIndex, isLastScreen]);

  const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(nextIndex);
  }, []);

  const renderPage = useCallback(({ item, index }: ListRenderItemInfo<IntroScreen>) => (
    <OnboardingPage item={item} index={index} />
  ), []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.header}>
        <BrandMark compact />
        {!isLastScreen ? (
          <Pressable accessibilityRole="button" onPress={() => void finishOnboarding()} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={INTRO_SCREENS}
        keyExtractor={(item) => item.id}
        renderItem={renderPage}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        style={styles.list}
      />

      <View style={styles.footer}>
        <PageIndicators count={INTRO_SCREENS.length} activeIndex={activeIndex} />
        {isLastScreen ? (
          <View style={styles.finalActions}>
            <PrimaryButton label="Get Started" onPress={finishOnboarding} />
            <PrimaryButton label="Skip" variant="secondary" onPress={finishOnboarding} />
          </View>
        ) : (
          <PrimaryButton label="Next" onPress={handleNext} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skipButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skipText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  skipPlaceholder: {
    width: 48,
  },
  list: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  pageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.sm,
  },
  pageInner: {
    gap: spacing.lg,
  },
  pageNumber: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  illustrationFrame: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 220,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  glowOrbPrimary: {
    backgroundColor: 'rgba(138, 92, 255, 0.22)',
    borderRadius: 999,
    height: 160,
    position: 'absolute',
    right: -24,
    top: -30,
    width: 160,
  },
  glowOrbSecondary: {
    backgroundColor: 'rgba(0, 245, 160, 0.14)',
    borderRadius: 999,
    bottom: -36,
    height: 140,
    left: -20,
    position: 'absolute',
    width: 140,
  },
  gradientStrip: {
    borderRadius: radii.pill,
    flexDirection: 'row',
    height: 6,
    left: spacing.lg,
    overflow: 'hidden',
    position: 'absolute',
    right: spacing.lg,
    top: spacing.md,
  },
  gradientSegment: {
    flex: 1,
  },
  illustrationEmoji: {
    fontSize: 72,
    marginBottom: spacing.sm,
  },
  illustrationCaption: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  flowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  flowStep: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    minWidth: 84,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  flowIcon: {
    fontSize: 28,
  },
  flowLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  flowArrow: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  copyBlock: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  highlightList: {
    gap: spacing.sm,
  },
  highlightCard: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  highlightDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  highlightText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  indicatorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  indicatorDot: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  indicatorDotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  finalActions: {
    gap: spacing.sm,
  },
});
