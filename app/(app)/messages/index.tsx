import { StyleSheet, Text, View } from 'react-native';

import { Card, Pill, PrimaryLink, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getRoleBadgeLabel } from '@/utils/roles';

export default function MessagesScreen() {
  const { profile } = useAuth();

  return (
    <Screen eyebrow="Messages" title="Start the discussion." subtitle="No inbox clutter. Just active founder-investor talks.">
      <Card>
        {profile ? <Pill label={getRoleBadgeLabel(profile.role)} tone="rgba(200,162,74,0.18)" /> : null}
        <View style={styles.avatarPair}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.avatar ?? 'PF'}</Text>
          </View>
          <View style={styles.connector} />
          <View style={[styles.avatar, styles.founderAvatar]}>
            <Text style={styles.avatarText}>A</Text>
          </View>
        </View>
        <Text style={styles.title}>Deal discussion ready</Text>
        <Text style={styles.copy}>
          Ask one simple question, confirm fit, and generate a Deal Card when both sides agree.
        </Text>
        <PrimaryLink href="/investor-feed" label="Discover more cards" variant="secondary" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarPair: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: 38,
    backgroundColor: colors.pokerRed,
  },
  founderAvatar: {
    backgroundColor: colors.pokerBlack,
  },
  avatarText: {
    color: colors.ivory,
    fontSize: 22,
    fontWeight: '900',
  },
  connector: {
    width: 72,
    height: 1,
    backgroundColor: colors.luxuryGold,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  copy: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
});
