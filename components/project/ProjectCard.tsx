import { Text, View } from 'react-native';

import { StartupPlayingCard, mapProjectToStartupCard } from '@/components/cards/StartupPlayingCard';
import { Card, Pill, PrimaryLink, ui } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import type { Project } from '@/types';
import { formatCurrency } from '@/utils/format';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card>
      <View style={{ maxWidth: 220, alignSelf: 'center', width: '100%' }}>
        <StartupPlayingCard card={mapProjectToStartupCard(project)} compact />
      </View>
      <View>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{project.title}</Text>
        <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>
          {project.metric ?? project.tagline}
        </Text>
      </View>
      <View style={ui.wrap}>
        <Pill label={`${project.equityOffered ?? 0}% equity`} tone="rgba(200, 162, 74, 0.16)" />
        <Pill label={project.founderVerified === false ? 'Founder' : 'Founder Verified'} />
      </View>
      <Text style={{ color: colors.muted }}>
        Seeking {formatCurrency(project.goalAmount)}
      </Text>
      <PrimaryLink href={`/projects/${project.id}`} label="Open card" variant="secondary" />
    </Card>
  );
}
