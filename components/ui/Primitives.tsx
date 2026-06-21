import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type ScreenProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function Screen({ eyebrow, title, subtitle, children }: ScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <BrandMark />
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </ScrollView>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <View style={compact ? styles.logoCompact : styles.logo}>
        <Text style={compact ? styles.logoTextCompact : styles.logoText}>PF</Text>
      </View>
      {!compact ? (
        <View>
          <Text style={styles.brandName}>PromptFund</Text>
          <Text style={styles.brandTagline}>Discover. Swipe. Invest.</Text>
        </View>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
    </Card>
  );
}

export function Pill({ label, tone = colors.panelMuted }: { label: string; tone?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: tone }]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(progress, 1)) * 100}%` }]} />
    </View>
  );
}

export function PrimaryLink({
  href,
  label,
  variant = 'primary',
}: {
  href: Href;
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  const buttonStyle = variant === 'secondary' ? styles.secondaryButton : styles.button;
  const buttonTextStyle = variant === 'secondary' ? styles.secondaryButtonText : styles.buttonText;

  return (
    <Link href={href} asChild>
      <Pressable style={buttonStyle}>
        <Text style={buttonTextStyle}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const buttonStyle = variant === 'secondary' ? styles.secondaryButton : styles.button;
  const buttonTextStyle = variant === 'secondary' ? styles.secondaryButtonText : styles.buttonText;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={disabled ? styles.disabledButton : buttonStyle}
    >
      <Text style={buttonTextStyle}>{label}</Text>
    </Pressable>
  );
}

export function LoadingState({ label = 'Loading PromptFund workspace' }: { label?: string }) {
  return (
    <Card style={styles.stateCard}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.stateTitle}>{label}</Text>
      <Text style={styles.stateCopy}>Shuffling startup cards.</Text>
    </Card>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <Card style={styles.stateCard}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>A</Text>
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateCopy}>{message}</Text>
      {action}
    </Card>
  );
}

export function FieldPreview({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  muted: {
    color: colors.muted,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 56,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: 16,
    backgroundColor: colors.cardIvory,
  },
  logoCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.cardIvory,
  },
  logoText: {
    color: colors.pokerRed,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoTextCompact: {
    color: colors.pokerRed,
    fontSize: 10,
    fontWeight: '900',
  },
  brandName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  brandTagline: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ivory,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.34)',
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.32)',
  },
  pillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: radii.pill,
    backgroundColor: colors.panelMuted,
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.pokerRed,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    backgroundColor: colors.panelMuted,
  },
  disabledButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    paddingHorizontal: spacing.lg,
    opacity: 0.72,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: '800',
  },
  stateCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateCopy: {
    color: colors.muted,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: radii.md,
    backgroundColor: colors.cardIvory,
  },
  emptyIconText: {
    color: colors.pokerRed,
    fontSize: 14,
    fontWeight: '900',
  },
  field: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.black,
    padding: spacing.md,
  },
  fieldLabel: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fieldValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
});
