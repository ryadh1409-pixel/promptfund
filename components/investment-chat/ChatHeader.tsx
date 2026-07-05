import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

type ChatHeaderProps = {
  unreadCount?: number;
  onSettingsPress?: () => void;
};

export function ChatHeader({ unreadCount = 0, onSettingsPress }: ChatHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        <Text style={styles.title}>Investment Chat</Text>
        <Text style={styles.subtitle}>
          Secure private conversation between Founder and Angel Investor.
        </Text>
      </View>
      <View style={styles.actions}>
        {unreadCount > 0 ? (
          <Text style={styles.unread}>{unreadCount}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chat settings"
          onPress={onSettingsPress}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    borderBottomColor: 'rgba(216, 201, 163, 0.18)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  unread: {
    backgroundColor: '#2A2418',
    borderColor: colors.accent,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 28,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: colors.panelMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  settingsIcon: {
    color: colors.accent,
    fontSize: 20,
    lineHeight: 22,
  },
});
