import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { StartupPlayingCard, sampleStartupCards, type StartupCard } from '@/components/cards/StartupPlayingCard';
import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/utils/format';

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

  return (
    <Screen eyebrow="Deal Table" title="Founder meets investor." subtitle="Simple cards. Simple next step.">
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
