import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import type { LegalDocument } from '@/constants/legal';

export function LegalDocumentView({
  document,
  showUnderstandButton = true,
}: {
  document: LegalDocument;
  showUnderstandButton?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Card style={styles.headerCard}>
        <Text style={styles.title}>{document.title}</Text>
        <Text style={styles.subtitle}>{document.subtitle}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaLabel}>Last Updated:</Text>
            <Text style={styles.metaValue}>{document.lastUpdated}</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaLabel}>Reading time</Text>
            <Text style={styles.metaValue}>{document.readingTimeMinutes} min</Text>
          </View>
        </View>
      </Card>
      {document.sections.map((section, index) => (
        <Card key={section.title} style={styles.sectionCard}>
          <Text style={styles.sectionNumber}>{String(index + 1).padStart(2, '0')}</Text>
          <Text style={styles.sectionTitle}>{index + 1}. {section.title}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </Card>
      ))}
      {showUnderstandButton ? (
        <Card style={styles.actionCard}>
          <PrimaryButton label="I Understand" onPress={() => router.back()} />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  headerCard: {
    gap: spacing.md,
    borderColor: 'rgba(200, 162, 74, 0.42)',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaPill: {
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.18)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.black,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: colors.luxuryGold,
    fontSize: 14,
    fontWeight: '900',
  },
  sectionCard: {
    gap: spacing.sm,
  },
  sectionNumber: {
    color: 'rgba(200, 162, 74, 0.52)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionTitle: {
    color: colors.luxuryGold,
    fontSize: 17,
    fontWeight: '900',
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
  },
  actionCard: {
    gap: spacing.sm,
  },
});
