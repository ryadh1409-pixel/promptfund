import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StartupPlayingCard, mapProjectToStartupCard, sampleStartupCards } from '@/components/cards/StartupPlayingCard';
import { Card, EmptyState, LoadingState, PrimaryLink, Screen } from '@/components/ui/Primitives';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fundingService } from '@/services/fundingService';
import { projectService } from '@/services/projectService';
import type { Investment } from '@/types/FundingRequest';
import type { Project } from '@/types/Project';

export default function DeckScreen() {
  const { authUser } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDeck() {
      if (!authUser) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const nextInvestments = await fundingService.listInvestmentsByInvestor(authUser.uid);
        const uniqueProjectIds = Array.from(new Set(nextInvestments.map((investment) => investment.projectId)));
        const nextProjects = await Promise.all(
          uniqueProjectIds.map((projectId) => projectService.getProjectById(projectId)),
        );

        setInvestments(nextInvestments);
        setProjects(nextProjects.filter((project): project is Project => Boolean(project)));
      } finally {
        setIsLoading(false);
      }
    }

    loadDeck();
  }, [authUser]);

  return (
    <Screen eyebrow="Deck" title="Your card collection." subtitle="Every investment becomes a collectible startup card.">
      {isLoading ? <LoadingState label="Loading your deck" /> : null}

      {!isLoading && projects.length === 0 ? (
        <EmptyState
          title="Your deck is empty"
          message="Swipe right on a startup card to start building your collection."
          action={<PrimaryLink href="/investor-feed" label="Discover cards" />}
        />
      ) : null}

      {!isLoading && projects.length > 0 ? (
        <>
          <View style={styles.grid}>
            {projects.map((project) => (
              <View key={project.id} style={styles.gridItem}>
                <StartupPlayingCard card={mapProjectToStartupCard(project)} compact />
              </View>
            ))}
          </View>
          <Card>
            <Text style={styles.collectionTitle}>Collection value</Text>
            <Text style={styles.collectionCopy}>
              {investments.length} card{investments.length === 1 ? '' : 's'} saved in your PromptFund deck.
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
    </Screen>
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
});
