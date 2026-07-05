import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

type DealRoomHeaderProps = {
  startupName: string;
  onSafetyPress?: () => void;
};

export function DealRoomHeader({ startupName, onSafetyPress }: DealRoomHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>Deal Room</Text>
        <Text style={styles.title} numberOfLines={1}>{startupName}</Text>
      </View>
      {onSafetyPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Safety settings" onPress={onSafetyPress} style={styles.settingsButton}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    borderBottomColor: 'rgba(216, 201, 163, 0.12)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: 6,
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
  },
  backButton: {
    paddingVertical: 2,
  },
  backLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: colors.panelMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  settingsIcon: {
    color: colors.accent,
    fontSize: 16,
  },
});
