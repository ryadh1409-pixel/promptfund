import { StyleSheet, Text, View } from 'react-native';

import { FieldPreview, PrimaryButton } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import type { InvestmentAgreement } from '@/types/InvestmentFlow';
import type { User } from '@/types/User';
import { safeCurrency, safeDate, safePercent } from '@/utils/safeFormat';

type DealRoomFundingSectionProps = {
  agreement: InvestmentAgreement | null;
  founderProfile: User | null;
  participantRole: 'founder' | 'investor' | null;
  isSaving: boolean;
  mode: 'instructions' | 'confirmation';
  onFundingArranged: () => void;
  onConfirmArrangement: () => void;
};

export function DealRoomFundingSection({
  agreement,
  founderProfile,
  participantRole,
  isSaving,
  mode,
  onFundingArranged,
  onConfirmArrangement,
}: DealRoomFundingSectionProps) {
  if (!agreement) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Funding</Text>
        <Text style={styles.body}>Funding instructions unlock after the agreement is signed by both parties.</Text>
      </View>
    );
  }

  const payoutDetails = formatPayoutDetails(founderProfile);
  const canViewContact = agreement.founderAccepted && agreement.investorAccepted && founderProfile?.shareFundingContactInfo === true;
  const isAwaitingInvestor = agreement.status === 'awaiting_funding';
  const isFundingArranged = agreement.status === 'funding_arranged';
  const isCompleted = agreement.status === 'completed';

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>{mode === 'instructions' ? 'Funding Instructions' : 'Funding Confirmation'}</Text>
        <View style={styles.grid}>
          <FieldPreview label="Startup" value={agreement.startupName} />
          <FieldPreview label="Funding Amount" value={`${safeCurrency(agreement.investmentAmount)} USD`} />
          <FieldPreview label="Equity Allocation" value={safePercent(agreement.investorAllocation)} />
        </View>
        <Text style={styles.disclaimer}>
          Ai PromptFund is not involved in the transfer of funds. Founders and investors arrange funding directly outside the app.
        </Text>
      </View>

      {mode === 'instructions' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Founder Contact</Text>
          {canViewContact && payoutDetails.length > 0 ? (
            <View style={styles.grid}>
              {payoutDetails.map((detail) => (
                <FieldPreview key={detail.label} label={detail.label} value={detail.value} />
              ))}
            </View>
          ) : (
            <Text style={styles.body}>No contact information has been shared yet.</Text>
          )}
        </View>
      ) : null}

      {!isCompleted ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Arrangement Status</Text>
          {participantRole === 'investor' ? (
            <>
              <Text style={styles.body}>Arrange funding directly with the Founder outside Ai PromptFund, then confirm here.</Text>
              <PrimaryButton
                label={isSaving ? 'Saving...' : 'I Have Arranged Funding Outside Ai PromptFund'}
                onPress={onFundingArranged}
                disabled={isSaving || !isAwaitingInvestor}
              />
              {isFundingArranged ? <Text style={styles.body}>Waiting for Founder confirmation.</Text> : null}
            </>
          ) : null}
          {participantRole === 'founder' ? (
            <>
              <Text style={styles.body}>
                {isFundingArranged
                  ? 'Investor has indicated that funding arrangements were completed outside Ai PromptFund.'
                  : 'Arrange funding directly with the Investor outside Ai PromptFund, then confirm here.'}
              </Text>
              {isAwaitingInvestor ? (
                <PrimaryButton
                  label={isSaving ? 'Saving...' : 'I Have Arranged Funding Outside Ai PromptFund'}
                  onPress={onFundingArranged}
                  disabled={isSaving}
                />
              ) : null}
              <PrimaryButton
                label={isSaving ? 'Confirming...' : 'Confirm Arrangement'}
                onPress={onConfirmArrangement}
                disabled={isSaving || !isFundingArranged}
              />
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function formatPayoutDetails(profile: User | null) {
  if (!profile) return [];
  return [
    profile.email ? { label: 'Email', value: profile.email } : null,
    profile.phone ? { label: 'Phone', value: profile.phone } : null,
    profile.linkedIn ? { label: 'LinkedIn', value: profile.linkedIn } : null,
    profile.website ? { label: 'Website', value: profile.website } : null,
  ].filter((detail): detail is { label: string; value: string } => detail !== null);
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    lineHeight: 20,
  },
  disclaimer: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  grid: {
    gap: spacing.md,
  },
});
