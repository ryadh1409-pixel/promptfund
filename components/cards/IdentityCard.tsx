import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  PLAYING_CARD_THEME,
  PlayingCardFrame,
  PlayingCardOrnament,
  playingCardSerifFont,
} from '@/components/cards/PlayingCardDecor';
import { spacing } from '@/constants/theme';
import type { UserRole } from '@/types/User';
import { getRoleTitle } from '@/utils/roles';

type IdentityCardProps = {
  fullName: string;
  username: string;
  role: UserRole;
  avatar: string;
  photoURL?: string;
  location?: string;
  bio?: string;
  memberSince?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

function formatUsername(username: string) {
  const trimmed = username.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export function IdentityCard({
  fullName,
  username,
  role,
  avatar,
  photoURL,
  location,
  compact = false,
  style,
}: IdentityCardProps) {
  const avatarSize = compact ? 72 : 108;
  const roleLabel = getRoleTitle(role);

  return (
    <PlayingCardFrame compact={compact} style={[styles.card, compact ? styles.compactCard : null, style]}>
      <View style={[styles.content, compact ? styles.contentCompact : null]}>
        <PlayingCardOrnament compact={compact} />

        <View style={[styles.centerBlock, compact ? styles.centerBlockCompact : null]}>
          {photoURL ? (
            <Image
              source={{ uri: photoURL }}
              style={[
                styles.avatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            >
              <Text style={[styles.avatarText, compact ? styles.avatarTextCompact : null]}>{avatar}</Text>
            </View>
          )}

          <Text style={[styles.name, compact ? styles.nameCompact : null]} numberOfLines={2}>
            {fullName}
          </Text>

          {username ? (
            <Text style={[styles.username, compact ? styles.usernameCompact : null]} numberOfLines={1}>
              {formatUsername(username)}
            </Text>
          ) : null}

          {location ? (
            <Text style={[styles.location, compact ? styles.locationCompact : null]} numberOfLines={1}>
              {location}
            </Text>
          ) : null}

          <Text style={[styles.role, compact ? styles.roleCompact : null]} numberOfLines={1}>
            {roleLabel}
          </Text>
        </View>

        <PlayingCardOrnament compact={compact} />
      </View>
    </PlayingCardFrame>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    aspectRatio: 0.714,
    maxWidth: 340,
    padding: spacing.lg,
    width: '100%',
  },
  compactCard: {
    maxWidth: 280,
    padding: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  contentCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  centerBlock: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  centerBlockCompact: {
    gap: 7,
    paddingVertical: spacing.xs,
  },
  avatar: {
    borderColor: PLAYING_CARD_THEME.border,
    borderWidth: 1.5,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: 'rgba(166, 35, 35, 0.08)',
    justifyContent: 'center',
  },
  avatarText: {
    color: PLAYING_CARD_THEME.suit,
    fontFamily: playingCardSerifFont,
    fontSize: 34,
    fontWeight: '700',
  },
  avatarTextCompact: {
    fontSize: 24,
  },
  name: {
    color: PLAYING_CARD_THEME.text,
    fontFamily: playingCardSerifFont,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 36,
    textAlign: 'center',
  },
  nameCompact: {
    fontSize: 24,
    lineHeight: 28,
  },
  username: {
    color: PLAYING_CARD_THEME.secondary,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  usernameCompact: {
    fontSize: 13,
  },
  location: {
    color: PLAYING_CARD_THEME.secondary,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  locationCompact: {
    fontSize: 12,
  },
  role: {
    color: PLAYING_CARD_THEME.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.1,
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  roleCompact: {
    fontSize: 11,
    letterSpacing: 0.9,
    marginTop: 2,
  },
});
