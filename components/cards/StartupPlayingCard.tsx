import { memo } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { PlayingCardFrame } from '@/components/cards/PlayingCardDecor';
import { colors, radii, spacing } from '@/constants/theme';
import type { InvestmentOpportunity, V5Investment } from '@/types/InvestmentFlow';
import type { Project, StartupCardRank } from '@/types/Project';
import { safeCurrency, safePercent } from '@/utils/safeFormat';

export type StartupCard = Pick<
  Project,
  | 'id'
  | 'startupName'
  | 'imageUrl'
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
  shortDescription?: string;
  fundingNeeded?: number;
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
    developerId: project.developerId ?? project.founderId,
    ownerId: project.ownerId ?? project.founderId,
    title: project.startupName ?? project.title ?? 'Startup',
    coverImage: project.imageUrl ?? project.coverImage,
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

function founderInitials(name?: string) {
  return name
    ?.split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PF';
}

export function mapOpportunityToStartupCard(opportunity: InvestmentOpportunity): StartupCard {
  const title = opportunity.title ?? opportunity.startupName;
  const description = opportunity.description ?? opportunity.shortDescription ?? opportunity.purpose;
  const askAmount = opportunity.askAmount ?? opportunity.fundingGoal ?? opportunity.fundingNeeded;
  const equity = opportunity.equity ?? opportunity.investorAllocation;

  return {
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
    founderAvatar: founderInitials(opportunity.founderName),
    founderVerified: true,
    rank: 'A',
    coverImage: opportunity.imageUrl,
    stage: opportunity.stage,
    traction: description,
    shortPitch: description,
  };
}

export function mapInvestmentToStartupCard(
  investment: V5Investment,
  opportunity?: InvestmentOpportunity | null,
): StartupCard {
  if (opportunity) {
    const card = mapOpportunityToStartupCard(opportunity);
    return {
      ...card,
      coverImage: opportunity.imageUrl ?? investment.startupImage ?? card.coverImage,
      goalAmount: opportunity.askAmount ?? opportunity.fundingGoal ?? opportunity.fundingNeeded ?? card.goalAmount,
      equityOffered: investment.allocation ?? opportunity.equity ?? opportunity.investorAllocation ?? card.equityOffered,
    };
  }

  const fundedAmount = investment.fundedAmount ?? investment.amount ?? 0;
  const fallbackDescription = investment.note?.trim()
    || investment.startupName
    || 'Startup opportunity';

  return {
    id: investment.startupId ?? investment.opportunityId ?? investment.id,
    startupName: investment.startupName ?? 'Portfolio Company',
    title: investment.startupName ?? 'Portfolio Company',
    tagline: fallbackDescription,
    shortDescription: fallbackDescription,
    description: fallbackDescription,
    fundingNeeded: fundedAmount,
    goalAmount: fundedAmount,
    equityOffered: investment.allocation,
    metric: 'Portfolio Company',
    founderName: investment.founderName ?? 'Founder',
    founderAvatar: founderInitials(investment.founderName),
    founderVerified: true,
    rank: 'A',
    coverImage: investment.startupImage,
    stage: 'Deal Completed',
    shortPitch: fallbackDescription,
  };
}

export const StartupPlayingCard = memo(function StartupPlayingCard({
  card,
  showBack = false,
  stageLabel,
  style,
}: {
  card: StartupCard;
  compact?: boolean;
  showBack?: boolean;
  stageLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const rank = card.rank ?? 'J';
  const suit = rank === 'A' || rank === 'Q' ? '♥' : '♠';
  const startupName = card.startupName ?? card.title;
  const founderName = card.founderName ?? 'Founder';
  const shortDescription = card.shortDescription ?? card.description ?? card.shortPitch ?? card.tagline ?? 'Startup opportunity';
  const fundingGoal = card.fundingNeeded ?? card.goalAmount;
  const allocation = card.equityOffered;
  const badgeLabel = stageLabel ?? card.stage;

  return (
    <PlayingCardFrame style={[styles.card, style]}>
      <View style={styles.innerBorder}>
        {showBack ? (
          <View style={styles.backContent}>
            <Text style={styles.backLabel}>Founder Card</Text>
            <Text style={styles.backTitle}>{card.title}</Text>
            <Text style={styles.backCopy}>{card.description}</Text>
          </View>
        ) : (
          <>
            <View style={styles.imagePanel}>
              {card.coverImage ? (
                <Image
                  source={{ uri: card.coverImage }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.coverFallback}>
                  <Text style={styles.imageSuit}>{suit}</Text>
                  <Text style={styles.imageText}>{rankLabels[rank]}</Text>
                </View>
              )}
            </View>

            <View style={styles.contentSection}>
              <Text style={styles.title} numberOfLines={2}>
                {startupName}
              </Text>
              <Text style={styles.byline} numberOfLines={1}>
                {founderName}
              </Text>
              <Text style={styles.pitch} numberOfLines={2}>
                {shortDescription}
              </Text>
            </View>

            <View style={styles.footerSection}>
              <View style={styles.metricsRow}>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Goal</Text>
                  <Text style={styles.metricValue}>{safeCurrency(fundingGoal)}</Text>
                </View>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Allocation</Text>
                  <Text style={styles.metricValue}>{safePercent(allocation)}</Text>
                </View>
              </View>
              {badgeLabel ? (
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText} numberOfLines={1}>
                    {badgeLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        )}
      </View>
    </PlayingCardFrame>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: spacing.md,
  },
  innerBorder: {
    gap: spacing.md,
    overflow: 'hidden',
    padding: spacing.md,
  },
  imagePanel: {
    aspectRatio: 16 / 9,
    backgroundColor: '#F3E8D0',
    borderRadius: radii.lg,
    overflow: 'hidden',
    width: '100%',
  },
  coverImage: {
    height: '100%',
    width: '100%',
  },
  coverFallback: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  imageSuit: {
    color: colors.pokerRed,
    fontSize: 72,
    fontWeight: '900',
    lineHeight: 80,
  },
  imageText: {
    color: colors.pokerBlack,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: spacing.xs,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  contentSection: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  title: {
    color: colors.pokerBlack,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  byline: {
    color: 'rgba(20, 20, 20, 0.68)',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  pitch: {
    color: 'rgba(20, 20, 20, 0.76)',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  footerSection: {
    borderTopColor: 'rgba(20, 20, 20, 0.12)',
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  metricLabel: {
    color: 'rgba(20, 20, 20, 0.55)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.pokerRed,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  stageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(166, 35, 35, 0.08)',
    borderColor: 'rgba(166, 35, 35, 0.24)',
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stageBadgeText: {
    color: colors.pokerRed,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  backContent: {
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 320,
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
});
