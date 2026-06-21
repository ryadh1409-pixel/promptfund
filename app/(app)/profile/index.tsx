import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Card, LoadingState, PrimaryButton, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fundingService } from '@/services/fundingService';
import type { Investment } from '@/types/FundingRequest';
import { formatCurrency } from '@/utils/format';

export default function UserProfileScreen() {
  const router = useRouter();
  const { authUser, profile, signOut } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const totalInvested = investments.reduce((sum, investment) => sum + investment.amount, 0);

  useEffect(() => {
    async function loadInvestments() {
      if (!authUser) {
        return;
      }

      setInvestments(await fundingService.listInvestmentsByInvestor(authUser.uid));
    }

    loadInvestments();
  }, [authUser]);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  if (!profile) {
    return (
      <Screen eyebrow="Profile" title="Loading profile" subtitle="Loading your card profile.">
        <LoadingState label="Loading profile" />
      </Screen>
    );
  }

  return (
    <Screen
      eyebrow="Profile"
      title={profile.name}
      subtitle="Your PromptFund card stats."
    >
      <Card>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: colors.pokerRed,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900' }}>{profile.avatar}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{profile.handle}</Text>
        </View>
      </Card>

      <View style={ui.row}>
        <StatCard label="Cards invested" value={String(investments.length)} tone={colors.accent} />
        <StatCard label="Total invested" value={formatCurrency(totalInvested)} tone={colors.luxuryGold} />
      </View>

      <View style={ui.row}>
        <StatCard label="Deals completed" value="0" tone={colors.pokerRed} />
        <StatCard label="Profile" value="Minimal" />
      </View>

      <Card>
        <PrimaryButton label="Sign out" variant="secondary" onPress={handleSignOut} />
      </Card>
    </Screen>
  );
}
