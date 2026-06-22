import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

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
  | 'logoUrl'
  | 'founderPhotoURL'
  | 'industry'
  | 'location'
  | 'raisedSoFar'
  | 'valuation'
  | 'stage'
  | 'traction'
  | 'monthlyRevenue'
  | 'growthPercent'
  | 'riskRating'
  | 'shortPitch'
> & {
  developerId?: string;
  ownerId?: string;
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
    developerId: 'sample-founder-neuroai',
    ownerId: 'sample-founder-neuroai',
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
    industry: 'EdTech AI',
    location: 'San Francisco, CA',
    raisedSoFar: 18500,
    valuation: 1250000,
    stage: 'Seed',
    traction: '1,200 active users',
    monthlyRevenue: 8200,
    growthPercent: 18,
    riskRating: 'Medium',
    shortPitch: 'Personalized AI recall loops for students and tutors.',
    isSample: true,
  },
  {
    id: 'sample-hostdeck',
    developerId: 'sample-founder-hostdeck',
    ownerId: 'sample-founder-hostdeck',
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
    industry: 'Developer Tools',
    location: 'Austin, TX',
    raisedSoFar: 7400,
    valuation: 620000,
    stage: 'Pre-seed',
    traction: '320 weekly deploys',
    monthlyRevenue: 3600,
    growthPercent: 11,
    riskRating: 'Medium',
    shortPitch: 'A clean cloud workflow for shipping indie AI products.',
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
    raisedSoFar: project.raisedSoFar ?? project.fundedAmount,
    traction: project.traction ?? project.metric ?? project.tagline,
    shortPitch: project.shortPitch ?? project.description,
    riskRating: project.riskRating ?? 'Medium',
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
              {card.coverImage ? (
                <Image source={{ uri: card.coverImage }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverFallback}>
                  <Text style={styles.imageSuit}>{suit}</Text>
                  <Text style={styles.imageText}>{rankLabels[rank]}</Text>
                </View>
              )}
              <View style={styles.logoBadge}>
                {card.logoUrl ? (
                  <Image source={{ uri: card.logoUrl }} style={styles.logoImage} />
                ) : (
                  <Text style={styles.logoText}>{card.title.slice(0, 2).toUpperCase()}</Text>
                )}
              </View>
            </View>
            <View style={styles.content}>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{card.industry ?? 'Startup'}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{card.location ?? 'Global'}</Text>
              </View>
              <Text style={styles.title}>{card.title}</Text>
              <Text style={styles.pitch}>{card.shortPitch ?? card.tagline}</Text>
              <View style={styles.statGrid}>
                <CardStat label="Funding Goal" value={formatCurrency(card.goalAmount)} />
                <CardStat label="Raised" value={formatCurrency(card.raisedSoFar ?? 0)} />
                <CardStat label="Valuation" value={card.valuation ? formatCurrency(card.valuation) : 'TBD'} />
                <CardStat label="Stage" value={card.stage ?? 'Early'} />
              </View>
              <View style={styles.tractionRow}>
                <Text style={styles.metric}>{card.traction ?? card.metric ?? card.tagline}</Text>
                <Text style={styles.growth}>{card.growthPercent ?? 0}% MoM</Text>
              </View>
              <View style={styles.tractionRow}>
                <Text style={styles.revenue}>
                  Revenue {card.monthlyRevenue ? formatCurrency(card.monthlyRevenue) : 'Pre-revenue'}
                </Text>
                <Text style={styles.risk}>Risk {card.riskRating ?? 'Medium'}</Text>
              </View>
              <View style={styles.founderRow}>
                <View style={styles.avatar}>
                  {card.founderPhotoURL ? (
                    <Image source={{ uri: card.founderPhotoURL }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{card.founderAvatar ?? 'PF'}</Text>
                  )}
                </View>
                <View style={styles.founderText}>
                  <Text style={styles.founderName}>{card.founderName ?? 'Founder'}</Text>
                  <Text style={styles.verified}>
                    {card.founderVerified === false ? 'Founder' : 'Founder Verified'}
                  </Text>
                  <Text style={styles.roleBadge}>Entrepreneur Badge</Text>
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

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
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
  logoBadge: {
    position: 'absolute',
    left: spacing.md,
    bottom: -22,
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderWidth: 2,
    borderColor: colors.cardIvory,
    borderRadius: 16,
    backgroundColor: colors.pokerBlack,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  logoText: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: '900',
  },
  content: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metaText: {
    color: colors.pokerBlack,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metaDot: {
    color: colors.luxuryGold,
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    color: colors.pokerBlack,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  pitch: {
    color: 'rgba(20, 20, 20, 0.76)',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBox: {
    width: '48%',
    borderWidth: 1,
    borderColor: 'rgba(20, 20, 20, 0.12)',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    padding: 8,
  },
  statLabel: {
    color: 'rgba(20, 20, 20, 0.55)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.pokerBlack,
    fontSize: 13,
    fontWeight: '900',
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
  tractionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  growth: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '900',
  },
  revenue: {
    color: colors.pokerBlack,
    fontSize: 13,
    fontWeight: '900',
  },
  risk: {
    color: colors.pokerRed,
    fontSize: 13,
    fontWeight: '900',
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
  roleBadge: {
    color: '#409CFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
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
