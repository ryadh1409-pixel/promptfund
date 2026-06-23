import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { userService } from '@/services/userService';
import type { ActiveRole } from '@/types/User';

const pathOptions: Array<{
  role: ActiveRole;
  icon: string;
  title: string;
  copy: string;
  cta: string;
}> = [
  {
    role: 'founder',
    icon: 'R',
    title: 'Founder',
    copy: 'Build the future. Showcase your startup, receive Interest, and raise capital.',
    cta: 'Continue as Founder',
  },
  {
    role: 'investor',
    icon: '$',
    title: 'Angel Investor',
    copy: 'Back exceptional founders. Swipe Startup opportunities and fund the next generation of companies.',
    cta: 'Continue as Investor',
  },
];

export default function ChoosePathScreen() {
  const router = useRouter();
  const { authUser, profile, refreshProfile } = useAuth();

  async function handleChooseRole(role: ActiveRole) {
    if (!authUser || !profile) {
      router.replace('/login');
      return;
    }

    try {
      const roles = Array.from(new Set([...(profile.roles ?? []), role]));
      await userService.updateUser(authUser.uid, {
        roles,
        activeRole: role,
        role: role === 'founder' ? 'entrepreneur' : 'angel_investor',
        intent: role,
      });
      await refreshProfile();
      router.replace('/investor-feed');
    } catch (error) {
      console.info('[PromptFund ChoosePath] role update failed', getFriendlyErrorMessage(error));
    }
  }

  return (
    <Screen
      eyebrow="PromptFund"
      title="Choose Your Path"
      subtitle="PromptFund connects founders and angel investors through simple funding cards."
    >
      {pathOptions.map((option) => (
        <Card key={option.role} style={styles.pathCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Text style={styles.iconText}>{option.icon}</Text>
            </View>
            <Text style={styles.title}>{option.title}</Text>
          </View>
          <Text style={styles.copy}>{option.copy}</Text>
          <PrimaryButton label={option.cta} onPress={() => handleChooseRole(option.role)} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pathCard: {
    overflow: 'hidden',
    borderColor: 'rgba(200, 162, 74, 0.52)',
    borderRadius: 30,
    backgroundColor: '#070707',
    padding: spacing.xl,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    height: 58,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(200, 162, 74, 0.12)',
  },
  iconText: {
    color: colors.luxuryGold,
    fontSize: 24,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  copy: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 25,
  },
});
