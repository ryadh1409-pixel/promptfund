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
import { fundPoints } from '@/data/mockData';

export default function FundPointsWalletScreen() {
  const isLoading = false;
  const wallet = fundPoints[0];

  return (
    <Screen
      eyebrow="PromptFund Wallet"
      title={`${wallet.balance.toLocaleString()} points`}
      subtitle="Fund Points reward trustworthy progress: updates, approved expenses, and shipped milestones."
    >
      {isLoading ? <LoadingState label="Loading Fund Points wallet" /> : null}

      <View style={ui.row}>
        <StatCard label="Lifetime earned" value={wallet.lifetimeEarned.toLocaleString()} tone={colors.accent} />
        <StatCard label="Weekly streak" value={`${wallet.streakWeeks}w`} tone={colors.success} />
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
      {!isLoading && wallet.history.length === 0 ? (
        <EmptyState
          title="No Fund Points yet"
          message="PromptFund awards points when builders publish updates, verify expenses, and hit milestone proof."
        />
      ) : null}
      {!isLoading &&
        wallet.history.map((item) => (
          <Card key={item.id}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>{item.label}</Text>
            <Text style={{ color: colors.muted }}>{item.date}</Text>
            <Text style={{ color: colors.success, fontSize: 22, fontWeight: '800' }}>
              +{item.points} points
            </Text>
          </Card>
        ))}
    </Screen>
  );
}
