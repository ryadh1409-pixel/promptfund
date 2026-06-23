import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { StartupPlayingCard, mapProjectToStartupCard } from '@/components/cards/StartupPlayingCard';
import {
  LoadingState,
  PrimaryButton,
  PrimaryLink,
  Screen,
} from '@/components/ui/Primitives';
import { projectService } from '@/services/projectService';
import type { Project } from '@/types/Project';

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
        <PrimaryLink href="/investor-feed" label="Back to Fundraising" />
      </Screen>
    );
  }

  return (
    <Screen
      eyebrow="Card Details"
      title={project.startupName ?? project.title}
      subtitle={project.description}
    >
      <View style={{ alignSelf: 'center', width: '100%', maxWidth: 360 }}>
        <StartupPlayingCard card={mapProjectToStartupCard(project)} showBack={showBack} />
      </View>
      <PrimaryButton
        label={showBack ? 'Show front' : 'Flip card'}
        variant="secondary"
        onPress={() => setShowBack((value) => !value)}
      />

      <Text style={{ color: '#EAE6D8', lineHeight: 21, textAlign: 'center' }}>
        Investors see this card exactly as your startup name, app screenshot, and short description.
      </Text>
    </Screen>
  );
}
