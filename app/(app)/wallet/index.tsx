import { Text, View } from 'react-native';

import {
  Card,
  EmptyState,
  LoadingState,
  Pill,
  Screen,
  SectionTitle,
  StatCard,
  ui,
} from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function FundPointsWalletScreen() {
  const { initializing, profile } = useAuth();
  const pointsBalance = 0;

  return (
    <Screen
      eyebrow="PromptFund Wallet"
      title={`${pointsBalance.toLocaleString()} points`}
      subtitle="Fund Points reward trustworthy progress: updates, approved expenses, and shipped milestones."
    >
      {initializing ? <LoadingState label="Loading Fund Points wallet" /> : null}

      <View style={ui.row}>
        <StatCard label="Trust score" value={String(profile?.trustScore ?? 0)} tone={colors.accent} />
        <StatCard label="Weekly streak" value="0w" tone={colors.success} />
      </View>

      <Card>
        <View style={ui.wrap}>
          <Pill label="Perk eligible" tone="rgba(52, 211, 153, 0.18)" />
          <Pill label="Investor visible" tone="rgba(139, 92, 246, 0.28)" />
        </View>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Next unlock: featured feed boost</Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>
          Reach 1,500 points to push your next funding request higher in investor discovery.
        </Text>
      </Card>

      <SectionTitle title="Point history" />
      {!initializing ? (
        <EmptyState
          title="No Fund Points yet"
          message="PromptFund awards points when builders publish updates, verify expenses, and hit milestone proof."
        />
      ) : null}
    </Screen>
  );
}
