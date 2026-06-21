import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import type { Project, StartupCardRank } from '@/types/Project';
import { formatCurrency } from '@/utils/format';

export type StartupCard = Pick<
  Project,
  | 'id'
  | 'title'
  | 'tagline'
  | 'description'
  | 'goalAmount'
  | 'equityOffered'
  | 'metric'
  | 'founderName'
  | 'founderAvatar'
  | 'founderVerified'
  | 'rank'
  | 'coverImage'
> & {
  isSample?: boolean;
};

export const rankLabels: Record<StartupCardRank, string> = {
  A: 'Exceptional Startup',
  K: 'Verified Founder',
  Q: 'High Growth',
  J: 'Early Stage',
};

export const sampleStartupCards: StartupCard[] = [
  {
    id: 'sample-neuroai',
    title: 'NeuroAI',
    tagline: 'AI memory coach for students.',
    description: 'A simple mobile coach that turns class notes into daily recall cards.',
    goalAmount: 50000,
    equityOffered: 4,
    metric: '1,200 Active Users',
    founderName: 'Maya Chen',
    founderAvatar: 'MC',
    founderVerified: true,
    rank: 'A',
    isSample: true,
  },
  {
    id: 'sample-hostdeck',
    title: 'HostDeck',
    tagline: 'One-click hosting for indie AI apps.',
    description: 'Deploy, monitor, and share lightweight AI projects without DevOps overhead.',
    goalAmount: 18000,
    equityOffered: 3,
    metric: '320 Weekly Deploys',
    founderName: 'Jon Bell',
    founderAvatar: 'JB',
    founderVerified: true,
    rank: 'K',
    isSample: true,
  },
];

export function mapProjectToStartupCard(project: Project): StartupCard {
  return {
    ...project,
    metric: project.metric ?? project.tagline,
    founderName: project.founderName ?? 'Founder',
    founderAvatar: project.founderAvatar ?? 'PF',
    founderVerified: project.founderVerified ?? true,
    rank: project.rank ?? 'J',
  };
}

export function StartupPlayingCard({
  card,
  compact = false,
  showBack = false,
  style,
}: {
  card: StartupCard;
  compact?: boolean;
  showBack?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const rank = card.rank ?? 'J';
  const suit = rank === 'A' || rank === 'Q' ? '♥' : '♠';
  const suitColor = suit === '♥' ? colors.pokerRed : colors.pokerBlack;

  return (
    <View style={[styles.card, compact ? styles.compactCard : null, style]}>
      <Corner rank={rank} suit={suit} color={suitColor} />
      <View style={styles.innerBorder}>
        {showBack ? (
          <View style={styles.backContent}>
            <Text style={styles.backLabel}>Founder Card</Text>
            <Text style={styles.backTitle}>{card.title}</Text>
            <Text style={styles.backCopy}>{card.description}</Text>
            <View style={styles.backRow}>
              <Text style={styles.backStat}>{formatCurrency(card.goalAmount)}</Text>
              <Text style={styles.backStat}>{card.equityOffered ?? 0}% Equity</Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.imagePanel}>
              <Text style={styles.imageSuit}>{suit}</Text>
              <Text style={styles.imageText}>{rankLabels[rank]}</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{card.title}</Text>
              <Text style={styles.goal}>Seeking {formatCurrency(card.goalAmount)}</Text>
              <Text style={styles.metric}>{card.metric ?? card.tagline}</Text>
              <View style={styles.founderRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{card.founderAvatar ?? 'PF'}</Text>
                </View>
                <View style={styles.founderText}>
                  <Text style={styles.founderName}>{card.founderName ?? 'Founder'}</Text>
                  <Text style={styles.verified}>
                    {card.founderVerified === false ? 'Founder' : 'Founder Verified'}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
      <View style={styles.mirroredCorner}>
        <Corner rank={rank} suit={suit} color={suitColor} />
      </View>
    </View>
  );
}

function Corner({ rank, suit, color }: { rank: string; suit: string; color: string }) {
  return (
    <View style={styles.corner}>
      <Text style={[styles.cornerRank, { color }]}>{rank}</Text>
      <Text style={[styles.cornerSuit, { color }]}>{suit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 0.714,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: 28,
    backgroundColor: colors.cardIvory,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
  compactCard: {
    aspectRatio: 0.714,
    padding: spacing.sm,
  },
  innerBorder: {
    flex: 1,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.48)',
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  corner: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.sm,
    zIndex: 3,
    alignItems: 'center',
  },
  cornerRank: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  cornerSuit: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 18,
  },
  mirroredCorner: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    transform: [{ rotate: '180deg' }],
  },
  imagePanel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44%',
    borderRadius: radii.lg,
    backgroundColor: '#F3E8D0',
  },
  imageSuit: {
    color: colors.pokerRed,
    fontSize: 78,
    fontWeight: '900',
    lineHeight: 86,
  },
  imageText: {
    color: colors.pokerBlack,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  content: {
    gap: spacing.sm,
  },
  title: {
    color: colors.pokerBlack,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  goal: {
    color: colors.pokerRed,
    fontSize: 19,
    fontWeight: '900',
  },
  metric: {
    color: colors.pokerBlack,
    fontSize: 18,
    fontWeight: '800',
  },
  founderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: 24,
    backgroundColor: colors.pokerBlack,
  },
  avatarText: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: '900',
  },
  founderText: {
    flex: 1,
  },
  founderName: {
    color: colors.pokerBlack,
    fontSize: 15,
    fontWeight: '900',
  },
  verified: {
    color: colors.luxuryGold,
    fontSize: 13,
    fontWeight: '900',
  },
  backContent: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  backLabel: {
    color: colors.pokerRed,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  backTitle: {
    color: colors.pokerBlack,
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  backCopy: {
    color: colors.pokerBlack,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
    textAlign: 'center',
  },
  backRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backStat: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: radii.md,
    color: colors.pokerBlack,
    fontSize: 15,
    fontWeight: '900',
    padding: spacing.sm,
    textAlign: 'center',
  },
});
