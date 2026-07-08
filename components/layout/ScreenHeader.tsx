import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

const SIDE_SLOT_MIN_WIDTH = 80;

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
};

export function ScreenHeader({
  title,
  subtitle,
  leftAction,
  rightAction,
}: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.side, styles.sideLeft]}>
        {leftAction ?? <View style={styles.sidePlaceholder} />}
      </View>
      <View style={styles.center}>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
      </View>
      <View style={[styles.side, styles.sideRight]}>
        {rightAction ?? <View style={styles.sidePlaceholder} />}
      </View>
    </View>
  );
}

export function ScreenHeaderBackButton({
  label = 'Back',
  onPress,
}: {
  label?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress ?? (() => router.back())}
      style={styles.textButton}
    >
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function ScreenHeaderTextButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={styles.textButton}
    >
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function ScreenHeaderIconButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.iconButton}
    >
      <Text style={styles.iconButtonLabel}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderBottomColor: 'rgba(216, 201, 163, 0.18)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 52,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  side: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    minWidth: SIDE_SLOT_MIN_WIDTH,
  },
  sideLeft: {
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  sidePlaceholder: {
    minHeight: 36,
    minWidth: SIDE_SLOT_MIN_WIDTH,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 36,
  },
  subtitle: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
  textButton: {
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  textButtonLabel: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.panelMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconButtonLabel: {
    color: colors.accent,
    fontSize: 18,
    lineHeight: 20,
  },
});
