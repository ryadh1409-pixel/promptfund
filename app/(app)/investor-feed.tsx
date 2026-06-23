import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IdentityCard } from '@/components/cards/IdentityCard';
import { InvestmentOpportunityCard } from '@/components/investment/InvestmentOpportunityCard';
import { Card, EmptyState, LoadingState, Pill, PrimaryLink, Screen } from '@/components/ui/Primitives';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import {
  investmentFlowService,
  mapProjectToOpportunity,
} from '@/services/investmentFlowService';
import { projectService } from '@/services/projectService';
import type { InvestmentOpportunity } from '@/types/InvestmentFlow';
import type { Project } from '@/types/Project';
import { getActiveRole, getRoleBadgeLabel } from '@/utils/roles';

const sampleOpportunity: InvestmentOpportunity = {
  id: 'promptfund-sample',
  startupName: 'PromptFund',
  founderId: 'sample-founder',
  founderName: 'Thamer Alharbi',
  fundingNeeded: 22,
  investorAllocation: 1,
  stage: 'MVP',
  shortDescription: 'Fund one month of AI development tools and product growth.',
  purpose: 'Fund one month of AI development tools and product growth.',
  status: 'open',
};

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

export default function InvestorFeedScreen() {
  const { authUser, profile } = useAuth();
  const activeRole = getActiveRole(profile);
  const isFounderMode = activeRole === 'founder';
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [isStartingDiscussion, setIsStartingDiscussion] = useState<string | null>(null);

  const visibleOpportunities = useMemo(
    () => (opportunities.length > 0 ? opportunities : [sampleOpportunity]),
    [opportunities],
  );

  useEffect(() => {
    async function loadOpportunities() {
      setIsLoading(true);
      setNotice(null);

      try {
        const [savedOpportunities, projects] = await Promise.all([
          investmentFlowService.listOpportunities(),
          projectService.listProjects(),
        ]);
        const projectOpportunities = projects.map((project: Project) => mapProjectToOpportunity(project));
        const merged = new Map<string, InvestmentOpportunity>();

        projectOpportunities.forEach((opportunity) => merged.set(opportunity.id, opportunity));
        savedOpportunities.forEach((opportunity) => merged.set(opportunity.id, opportunity));

        setOpportunities(Array.from(merged.values()));
      } catch (loadError) {
        setNotice(getFriendlyErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    loadOpportunities();
  }, []);

  async function handleStartDiscussion(opportunity: InvestmentOpportunity) {
    if (!authUser || !profile) {
      setNotice('Sign in as an Angel Investor to start an Investment Discussion Room.');
      return;
    }

    if (opportunity.founderId === authUser.uid) {
      setNotice('Founders can view investor interest from My Cards.');
      return;
    }

    if (opportunity.id === sampleOpportunity.id) {
      setNotice('Publish or discover a real startup opportunity to start a discussion.');
      return;
    }

    setIsStartingDiscussion(opportunity.id);
    try {
      const room = await investmentFlowService.startDiscussion({
        opportunity,
        investorId: authUser.uid,
        investorName: profile.displayName ?? profile.name,
      });
      router.push(`/discussion-room/${room.id}`);
    } catch (discussionError) {
      setNotice(getFriendlyErrorMessage(discussionError));
    } finally {
      setIsStartingDiscussion(null);
    }
  }

  return (
    <Screen
      eyebrow={isFounderMode ? 'Founder Capital' : 'Angel Investor'}
      title={isFounderMode ? 'Meet angel investors.' : 'Investment opportunities.'}
      subtitle={
        isFounderMode
          ? 'Your startup profile is discoverable by angels looking for focused early opportunities.'
          : 'Review founder-led opportunities, open a discussion, and move to agreement when both parties are ready.'
      }
    >
      {profile ? <Pill label={getRoleBadgeLabel(profile.role)} tone="rgba(200,162,74,0.18)" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      {isLoading ? <LoadingState label="Loading investment opportunities" /> : null}

      {!isLoading && isFounderMode ? (
        <View style={styles.identityStage}>
          <IdentityCard {...sampleInvestor} />
          <Card>
            <Text style={styles.panelTitle}>Founder Funding Flow</Text>
            <Text style={styles.panelCopy}>
              Angel Investors can open an Investment Discussion Room from your Startup opportunity. When both
              sides are ready, PromptFund generates the Investment Agreement and payment flow.
            </Text>
            <PrimaryLink href="/projects/create" label="Publish Startup Opportunity" />
          </Card>
        </View>
      ) : null}

      {!isLoading && !isFounderMode && visibleOpportunities.length === 0 ? (
        <EmptyState
          title="No investment opportunities yet."
          message="Founders can publish an opportunity in under 60 seconds."
          action={<PrimaryLink href="/projects/create" label="Create Startup Opportunity" />}
        />
      ) : null}

      {!isLoading && !isFounderMode ? (
        <View style={styles.list}>
          {visibleOpportunities.map((opportunity) => (
            <InvestmentOpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onView={() => router.push(`/projects/${opportunity.id}`)}
              onStartDiscussion={() => handleStartDiscussion(opportunity)}
            />
          ))}
          {isStartingDiscussion ? (
            <Text style={styles.helper}>Opening Investment Discussion Room...</Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  identityStage: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.lg,
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
  helper: {
    color: colors.muted,
    textAlign: 'center',
  },
});
