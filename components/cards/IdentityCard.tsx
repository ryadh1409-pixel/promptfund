import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import type { UserRole } from '@/types/User';
import { getRoleBadgeLabel } from '@/utils/roles';

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

function formatMemberSince(value: string | undefined) {
  if (!value) {
    return 'Member Since Recently';
  }

  return `Member Since ${new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))}`;
}

function getRoleTitle(role: UserRole) {
  if (role === 'entrepreneur') {
    return 'ENTREPRENEUR';
  }

  if (role === 'angel_investor') {
    return 'ANGEL INVESTOR';
  }

  return 'ADMIN';
}

export function IdentityCard({
  fullName,
  username,
  role,
  avatar,
  photoURL,
  location,
  bio,
  memberSince,
  compact = false,
  style,
}: IdentityCardProps) {
  const roleTone = role === 'entrepreneur' ? styles.blueBadge : styles.goldBadge;

  return (
    <View style={[styles.card, compact ? styles.compactCard : null, style]}>
      <View style={styles.topAccent} />
      <View style={styles.header}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={compact ? styles.avatarCompact : styles.avatar} />
        ) : (
          <View style={[compact ? styles.avatarCompact : styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{avatar}</Text>
          </View>
        )}
        <View style={styles.identity}>
          <Text style={styles.roleTitle}>{getRoleTitle(role)}</Text>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.username}>Username: {username}</Text>
        </View>
      </View>
      <View style={[styles.badge, roleTone]}>
        <Text style={styles.badgeText}>{getRoleBadgeLabel(role)}</Text>
      </View>
      {location ? <Text style={styles.location}>{location}</Text> : null}
      {bio ? <Text style={styles.bio}>{bio}</Text> : null}
      <Text style={styles.memberSince}>{formatMemberSince(memberSince)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.46)',
    borderRadius: 30,
    backgroundColor: '#090909',
    padding: spacing.xl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 10,
  },
  compactCard: {
    padding: spacing.lg,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 88,
    backgroundColor: 'rgba(200, 162, 74, 0.12)',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    width: 104,
    height: 104,
    borderWidth: 2,
    borderColor: colors.luxuryGold,
    borderRadius: 52,
  },
  avatarCompact: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: 36,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
  },
  avatarText: {
    color: colors.luxuryGold,
    fontSize: 24,
    fontWeight: '900',
  },
  identity: {
    flex: 1,
    gap: 5,
  },
  roleTitle: {
    color: colors.luxuryGold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  name: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  username: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  goldBadge: {
    borderColor: 'rgba(200, 162, 74, 0.56)',
    backgroundColor: 'rgba(200, 162, 74, 0.16)',
  },
  blueBadge: {
    borderColor: 'rgba(64, 156, 255, 0.56)',
    backgroundColor: 'rgba(64, 156, 255, 0.16)',
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  location: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  bio: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  memberSince: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
