import { Text, View } from 'react-native';

import { Card, Pill, PrimaryLink, ProgressBar, ui } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import type { Project } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/format';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card>
      <View style={ui.wrap}>
        <Pill label={project.status} tone={project.status === 'funding' ? colors.primary : colors.panelMuted} />
        <Pill label={formatPercent(project.progress)} tone="rgba(34, 211, 238, 0.18)" />
      </View>
      <View>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{project.title}</Text>
        <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 20 }}>{project.tagline}</Text>
      </View>
      <ProgressBar progress={project.progress} />
      <Text style={{ color: colors.muted }}>
        {formatCurrency(project.fundedAmount)} raised of {formatCurrency(project.goalAmount)}
      </Text>
      <PrimaryLink href={`/projects/${project.id}`} label="View project" variant="secondary" />
    </Card>
  );
}
