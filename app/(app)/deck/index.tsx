import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IdentityCard } from '@/components/cards/IdentityCard';
import { StartupPlayingCard, mapProjectToStartupCard, sampleStartupCards } from '@/components/cards/StartupPlayingCard';
import { Card, EmptyState, LoadingState, PrimaryLink, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fundingService } from '@/services/fundingService';
import { projectService } from '@/services/projectService';
import type { Investment } from '@/types/FundingRequest';
import type { Project } from '@/types/Project';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { getActiveRole } from '@/utils/roles';

export default function DeckScreen() {
  const { authUser, profile } = useAuth();
  const activeRole = getActiveRole(profile);
  const isFounderMode = activeRole === 'founder';
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDeck() {
      if (!authUser) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const nextInvestments = isFounderMode ? [] : await fundingService.listInvestmentsByInvestor(authUser.uid);
        const nextProjects = isFounderMode
          ? await projectService.listProjectsByDeveloper(authUser.uid)
          : (await Promise.all(
              Array.from(new Set(nextInvestments.map((investment) => investment.projectId))).map((projectId) =>
                projectService.getProjectById(projectId),
              ),
            )).filter((project): project is Project => Boolean(project));

        setInvestments(nextInvestments);
        setProjects(nextProjects);
      } catch (loadError) {
        setError(getFriendlyErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    loadDeck();
  }, [authUser, isFounderMode]);

  return (
    <Screen eyebrow="My Cards" title="Everything is a card." subtitle="Your funding identity, saved opportunities, deals, agreements, and verification live here.">
      {isLoading ? <LoadingState label="Loading your deck" /> : null}
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      {profile ? (
        <IdentityCard
          fullName={profile.displayName ?? profile.name}
          username={profile.username ?? profile.handle}
          role={profile.role}
          avatar={profile.avatar}
          photoURL={profile.photoURL}
          location={profile.location}
          bio={isFounderMode ? 'Founder card for raising capital through PromptFund.' : 'Investor profile card for backing exceptional founders.'}
          memberSince={profile.memberSince}
          compact
        />
      ) : null}

      <View style={ui.row}>
        <StatCard label="Deal Cards" value="0" tone={colors.luxuryGold} />
        <StatCard label="Agreement Cards" value="0" tone={colors.accent} />
      </View>

      {!isLoading && projects.length === 0 && !isFounderMode ? (
        <EmptyState
          title="No startup cards collected yet."
          message="Swipe right to save startups. Invest later from your collection."
          action={<PrimaryLink href="/investor-feed" label="Browse Startups" />}
        />
      ) : null}

      {!isLoading && projects.length === 0 && isFounderMode ? (
        <EmptyState
          title="No startup card yet."
          message="Create your founder card so investors can discover and save your company."
          action={<PrimaryLink href="/projects/create" label="Create Startup Card" />}
        />
      ) : null}

      {!isLoading && projects.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{isFounderMode ? 'Startup Card' : 'Saved Startup Cards'}</Text>
          <View style={styles.grid}>
            {projects.map((project) => (
              <View key={project.id} style={styles.gridItem}>
                <StartupPlayingCard card={mapProjectToStartupCard(project)} compact />
              </View>
            ))}
          </View>
          <Card>
            <Text style={styles.collectionTitle}>{isFounderMode ? 'Funding Card' : 'Collection Card'}</Text>
            <Text style={styles.collectionCopy}>
              {isFounderMode
                ? 'Track funding progress from investor interest to agreement.'
                : `${investments.length} saved startup card${investments.length === 1 ? '' : 's'} in your PromptFund collection.`}
            </Text>
          </Card>
        </>
      ) : null}

      {!isLoading && projects.length === 0 ? (
        <View style={styles.grid}>
          {sampleStartupCards.map((card) => (
            <View key={card.id} style={styles.gridItem}>
              <StartupPlayingCard card={card} compact />
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.cardGrid}>
        <SystemCard title="Pitch Card" copy={isFounderMode ? 'Your simple startup pitch for investors.' : 'Saved founder pitches appear here.'} />
        <SystemCard title="Deal Card" copy="Generated automatically when mutual interest exists." />
        <SystemCard title="Agreement Card" copy="Generated when both parties agree to proceed." />
        <SystemCard title="Verification Card" copy="Trust level and PromptFund verification status." />
      </View>
    </Screen>
  );
}

function SystemCard({ title, copy }: { title: string; copy: string }) {
  return (
    <Card style={styles.systemCard}>
      <Text style={styles.systemTitle}>{title}</Text>
      <Text style={styles.collectionCopy}>{copy}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    width: '47%',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  cardGrid: {
    gap: spacing.md,
  },
  systemCard: {
    borderColor: 'rgba(200, 162, 74, 0.32)',
    borderRadius: radii.lg,
    backgroundColor: '#080808',
  },
  systemTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  collectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  collectionCopy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: colors.danger,
    lineHeight: 22,
  },
});
