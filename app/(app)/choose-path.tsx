import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { userService } from '@/services/userService';
import type { ActiveRole } from '@/types/User';
import { appRouteForRole } from '@/utils/onboarding';

const pathOptions: Array<{
  role: ActiveRole;
  icon: string;
  title: string;
  cta: string;
}> = [
  {
    role: 'founder',
    icon: 'R',
    title: 'Founder',
    cta: 'Continue as Founder',
  },
  {
    role: 'investor',
    icon: '$',
    title: 'Angel Investor',
    cta: 'Continue as Angel Investor',
  },
];

function PathDescription({ role }: { role: ActiveRole }) {
  if (role === 'founder') {
    return (
      <View style={styles.descriptionBlock}>
        <Text style={styles.copy}>
          Present your startup idea as an investment card. If selected by an angel investor, you may request an initial funding round of{' '}
          <Text style={styles.accent}>USD $22</Text> to cover the subscription cost of an AI development tool that helps you build your product, write prompts, and accelerate development.
        </Text>
        <Text style={styles.copy}>
          The proposed funding is independently negotiated between you and the investor{' '}
          <Text style={styles.accent}>outside the Ai PromptFund platform</Text>.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.descriptionBlock}>
      <Text style={styles.copy}>
        Browse startup investment cards using a swipe experience. Discover founders with promising ideas and choose whether to support an initial{' '}
        <Text style={styles.accent}>USD $22</Text> funding round to help them access AI development tools and begin building their startup.
      </Text>
      <Text style={styles.copy}>
        All investment decisions are voluntary and negotiated directly between the investor and the founder{' '}
        <Text style={styles.accent}>outside Ai PromptFund</Text>.
      </Text>
    </View>
  );
}

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
        role,
        intent: role,
        hasChosenPath: true,
      });
      await refreshProfile();
      router.replace(appRouteForRole(role));
    } catch (error) {
      console.info('[PromptFund ChoosePath] role update failed', getFriendlyErrorMessage(error));
    }
  }

  return (
    <Screen
      eyebrow="Ai PromptFund"
      title="Choose Your Path"
      subtitle="Ai PromptFund connects founders seeking small AI tool funding with angel investors looking to support promising early-stage ideas."
    >
      <View style={styles.cardsSection}>
        {pathOptions.map((option) => (
          <Card key={option.role} style={styles.pathCard}>
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBadge}>
                  <Text style={styles.iconText}>{option.icon}</Text>
                </View>
                <Text style={styles.title}>{option.title}</Text>
              </View>
              <PathDescription role={option.role} />
            </View>
            <PrimaryButton label={option.cta} onPress={() => handleChooseRole(option.role)} />
          </Card>
        ))}
      </View>
      <Text style={styles.legalNote}>
        Ai PromptFund only facilitates introductions between founders and angel investors. It does not process payments, hold funds, negotiate investments, provide legal or financial advice, or participate in any funding agreement. All funding transactions, equity discussions, and contractual arrangements occur independently outside the Ai PromptFund platform.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardsSection: {
    gap: spacing.lg,
  },
  pathCard: {
    overflow: 'hidden',
    borderColor: 'rgba(200, 162, 74, 0.52)',
    borderRadius: 30,
    backgroundColor: '#070707',
    padding: spacing.xl,
    gap: spacing.lg,
    minHeight: 420,
    justifyContent: 'space-between',
  },
  cardBody: {
    flex: 1,
    gap: spacing.lg,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  descriptionBlock: {
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
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 26,
  },
  accent: {
    color: colors.luxuryGold,
    fontWeight: '700',
  },
  legalNote: {
    color: colors.subtle,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
});
