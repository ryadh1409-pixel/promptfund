import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { StartupPlayingCard, mapProjectToStartupCard } from '@/components/cards/StartupPlayingCard';
import {
  Card,
  LoadingState,
  Pill,
  PrimaryButton,
  PrimaryLink,
  Screen,
  ui,
} from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { projectService } from '@/services/projectService';
import type { Project } from '@/types/Project';
import { formatCurrency } from '@/utils/format';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    async function loadProjectDetails() {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        setProject(await projectService.getProjectById(id));
      } finally {
        setIsLoading(false);
      }
    }

    loadProjectDetails();
  }, [id]);

  if (isLoading) {
    return (
      <Screen eyebrow="Card Details" title="Loading card" subtitle="Shuffling this startup card.">
        <LoadingState label="Loading card" />
      </Screen>
    );
  }

  if (!project) {
    return (
      <Screen eyebrow="Card Details" title="Card not found" subtitle="This startup card is not available.">
        <PrimaryLink href="/investor-feed" label="Back to Discover" />
      </Screen>
    );
  }

  return (
    <Screen eyebrow="Card Details" title={project.title} subtitle={project.description}>
      <View style={{ alignSelf: 'center', width: '100%', maxWidth: 360 }}>
        <StartupPlayingCard card={mapProjectToStartupCard(project)} showBack={showBack} />
      </View>
      <PrimaryButton
        label={showBack ? 'Show front' : 'Flip card'}
        variant="secondary"
        onPress={() => setShowBack((value) => !value)}
      />

      <View style={ui.wrap}>
        <Pill label={`Seeking ${formatCurrency(project.goalAmount)}`} tone="rgba(200, 162, 74, 0.16)" />
        <Pill label={`${project.equityOffered ?? 0}% equity`} />
        <Pill label={project.founderVerified === false ? 'Founder' : 'Founder Verified'} />
      </View>

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
          {project.metric ?? project.tagline}
        </Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>{project.description}</Text>
        <PrimaryLink
          href={{
            pathname: '/deals',
            params: {
              startup: project.title,
              amount: String(Math.round(project.goalAmount * 0.1)),
              equity: String(project.equityOffered ?? 0),
              founder: project.founderName ?? 'Founder',
            },
          }}
          label="Open Deal Table"
        />
      </Card>
    </Screen>
  );
}
