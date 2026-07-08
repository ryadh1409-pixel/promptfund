import { StyleSheet, Text, View } from 'react-native';

import { ChatSettingsButton } from '@/components/chat/ChatSettings';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { colors, radii, spacing } from '@/constants/theme';

type ChatHeaderProps = {
  unreadCount?: number;
  onSettingsPress?: () => void;
};

export function ChatHeader({ unreadCount = 0, onSettingsPress }: ChatHeaderProps) {
  return (
    <View style={styles.wrap}>
      <ScreenHeader
        title="Investment Chat"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'Secure private conversation'}
        rightAction={onSettingsPress ? (
          <View style={styles.actions}>
            {unreadCount > 0 ? <Text style={styles.unread}>{unreadCount}</Text> : null}
            <ChatSettingsButton onPress={onSettingsPress} />
          </View>
        ) : undefined}
      />
      <Text style={styles.bodyCopy}>
        Secure private conversation between Founder and Angel Investor.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  bodyCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  unread: {
    backgroundColor: '#2A2418',
    borderColor: colors.accent,
    borderRadius: radii.pill,
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
});
