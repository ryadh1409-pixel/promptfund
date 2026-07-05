import { StyleSheet, Text, View } from 'react-native';

import { FieldPreview, PrimaryButton } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import type { InvestmentAgreement } from '@/types/InvestmentFlow';
import { safeCurrency, safeDate, safePercent } from '@/utils/safeFormat';

type DealRoomAgreementSectionProps = {
  agreement: InvestmentAgreement | null;
  participantRole: 'founder' | 'investor' | null;
  isWorking: boolean;
  onAccept: (role: 'founder' | 'investor') => void;
  onGenerate: () => void;
};

export function DealRoomAgreementSection({
  agreement,
  participantRole,
  isWorking,
  onAccept,
  onGenerate,
}: DealRoomAgreementSectionProps) {
  if (!agreement) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Investment Agreement</Text>
        <Text style={styles.body}>Generate the agreement once both parties are ready.</Text>
        <PrimaryButton label={isWorking ? 'Generating...' : 'Generate Agreement'} onPress={onGenerate} disabled={isWorking} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>{agreement.startupName}</Text>
        <View style={styles.grid}>
          <FieldPreview label="Founder" value={agreement.founderName} />
          <FieldPreview label="Angel Investor" value={agreement.investorName} />
          <FieldPreview label="Investment Amount" value={`${safeCurrency(agreement.investmentAmount)} USD`} />
          <FieldPreview label="Investor Allocation" value={safePercent(agreement.investorAllocation)} />
          <FieldPreview label="Agreement Date" value={safeDate(agreement.agreementDate)} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Agreement Terms</Text>
        <Text style={styles.term}>The Angel Investor agrees to provide funding to support the Startup.</Text>
        <Text style={styles.term}>The Founder agrees to the investment allocation described in this agreement.</Text>
        <Text style={styles.term}>Both parties acknowledge that they entered this agreement voluntarily.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Acceptance</Text>
        <View style={styles.acceptanceRow}>
          <AcceptanceBadge label="Founder" accepted={agreement.founderAccepted} />
          <AcceptanceBadge label="Investor" accepted={agreement.investorAccepted} />
        </View>
        <View style={styles.actions}>
          <PrimaryButton
            label="Accept As Founder"
            variant="secondary"
            onPress={() => onAccept('founder')}
            disabled={participantRole !== 'founder' || agreement.founderAccepted || isWorking}
          />
          <PrimaryButton
            label="Accept As Investor"
            variant="secondary"
            onPress={() => onAccept('investor')}
            disabled={participantRole !== 'investor' || agreement.investorAccepted || isWorking}
          />
        </View>
      </View>
    </View>
  );
}

function AcceptanceBadge({ label, accepted }: { label: string; accepted: boolean }) {
  return (
    <View style={[styles.badge, accepted ? styles.badgeActive : null]}>
      <Text style={styles.badgeLabel}>{label}</Text>
      <Text style={styles.badgeValue}>{accepted ? 'Accepted' : 'Pending'}</Text>
    </View>
  );
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
  body: {
    color: colors.muted,
    lineHeight: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  grid: {
    gap: spacing.md,
  },
  term: {
    color: colors.text,
    lineHeight: 22,
  },
  acceptanceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    borderColor: 'rgba(216, 201, 163, 0.24)',
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.sm,
  },
  badgeActive: {
    backgroundColor: 'rgba(200, 162, 74, 0.08)',
    borderColor: colors.accent,
  },
  badgeLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  actions: {
    gap: spacing.sm,
  },
});
