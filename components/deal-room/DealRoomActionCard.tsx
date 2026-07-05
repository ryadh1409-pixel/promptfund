import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type DealRoomActionCardProps = {
  title: string;
  body: string;
  buttonLabel: string;
  isSaving?: boolean;
  onPress: () => void;
};

export function DealRoomActionCard({ title, body, buttonLabel, isSaving = false, onPress }: DealRoomActionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        onPress={onPress}
        style={[styles.button, isSaving ? styles.buttonDisabled : null]}
      >
        <Text style={styles.buttonLabel}>{isSaving ? 'Saving...' : buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: colors.black,
    fontSize: 15,
    fontWeight: '800',
  },
});
