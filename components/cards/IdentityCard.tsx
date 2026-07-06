import { Image, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

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

const CARD = {
  background: '#F8F5EE',
  border: '#A62323',
  text: '#1F1F1F',
  secondary: '#666666',
  suit: '#A62323',
};

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

function CornerMark({ compact }: { compact: boolean }) {
  return (
    <View style={styles.cornerMark}>
      <Text style={[styles.cornerRank, compact ? styles.cornerRankCompact : null]}>A</Text>
      <Text style={[styles.cornerSuit, compact ? styles.cornerSuitCompact : null]}>♥</Text>
    </View>
  );
}

function CardOrnament({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.ornament, compact ? styles.ornamentCompact : null]}>
      <View style={styles.ornamentLine} />
      <Text style={[styles.ornamentHeart, compact ? styles.ornamentHeartCompact : null]}>♥</Text>
      <View style={styles.ornamentLine} />
    </View>
  );
}

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
    <View style={[styles.card, compact ? styles.compactCard : null, style]}>
      <View style={styles.textureOverlay} pointerEvents="none" />

      <View style={styles.topCorner}>
        <CornerMark compact={compact} />
      </View>
      <View style={styles.bottomCorner}>
        <CornerMark compact={compact} />
      </View>

      <View style={[styles.content, compact ? styles.contentCompact : null]}>
        <CardOrnament compact={compact} />

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

        <CardOrnament compact={compact} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    aspectRatio: 0.714,
    backgroundColor: CARD.background,
    borderColor: CARD.border,
    borderRadius: 30,
    borderWidth: 1.5,
    maxWidth: 340,
    overflow: 'hidden',
    padding: spacing.lg,
    width: '100%',
  },
  compactCard: {
    maxWidth: 280,
    padding: spacing.md,
  },
  textureOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    opacity: 0.35,
  },
  topCorner: {
    left: spacing.md,
    position: 'absolute',
    top: spacing.sm,
    zIndex: 2,
  },
  bottomCorner: {
    bottom: spacing.sm,
    position: 'absolute',
    right: spacing.md,
    transform: [{ rotate: '180deg' }],
    zIndex: 2,
  },
  cornerMark: {
    alignItems: 'center',
    gap: 1,
  },
  cornerRank: {
    color: CARD.suit,
    fontFamily: serifFont,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  cornerRankCompact: {
    fontSize: 22,
    lineHeight: 24,
  },
  cornerSuit: {
    color: CARD.suit,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  cornerSuitCompact: {
    fontSize: 14,
    lineHeight: 14,
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
  ornament: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.md,
  },
  ornamentCompact: {
    gap: 8,
    paddingHorizontal: spacing.sm,
  },
  ornamentLine: {
    backgroundColor: 'rgba(166, 35, 35, 0.22)',
    flex: 1,
    height: 1,
  },
  ornamentHeart: {
    color: CARD.suit,
    fontSize: 11,
    lineHeight: 12,
  },
  ornamentHeartCompact: {
    fontSize: 9,
    lineHeight: 10,
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
    borderColor: CARD.border,
    borderWidth: 1.5,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: 'rgba(166, 35, 35, 0.08)',
    justifyContent: 'center',
  },
  avatarText: {
    color: CARD.suit,
    fontFamily: serifFont,
    fontSize: 34,
    fontWeight: '700',
  },
  avatarTextCompact: {
    fontSize: 24,
  },
  name: {
    color: CARD.text,
    fontFamily: serifFont,
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
    color: CARD.secondary,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  usernameCompact: {
    fontSize: 13,
  },
  location: {
    color: CARD.secondary,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  locationCompact: {
    fontSize: 12,
  },
  role: {
    color: CARD.text,
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
