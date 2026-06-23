import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, FieldPreview, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import type { InvestmentAgreement } from '@/types/InvestmentFlow';
import { safeCurrency, safeDate, safePercent } from '@/utils/safeFormat';

export default function InvestmentAgreementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authUser } = useAuth();
  const [agreement, setAgreement] = useState<InvestmentAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const participantRole = useMemo(() => {
    if (!authUser || !agreement) {
      return null;
    }
    if (authUser.uid === agreement.founderId) {
      return 'founder';
    }
    if (authUser.uid === agreement.investorId) {
      return 'investor';
    }
    return null;
  }, [agreement, authUser]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const unsubscribe = onSnapshot(
      doc(getPromptFundFirestore(), firestoreCollections.agreements, id),
      (snapshot) => {
        setAgreement(snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as InvestmentAgreement) : null);
        setIsLoading(false);
      },
      (error) => {
        setNotice(getFriendlyErrorMessage(error));
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (agreement?.status === 'awaiting_funding') {
      router.replace(`/payment/${agreement.id}`);
    }
  }, [agreement]);

  async function handleAccept(role: 'founder' | 'investor') {
    if (!agreement) {
      return;
    }

    try {
      const updated = await investmentFlowService.acceptAgreement(agreement, role);
      if (updated.status === 'awaiting_funding') {
        setNotice('Both parties accepted. Investment is awaiting funding.');
      }
    } catch (acceptError) {
      setNotice(getFriendlyErrorMessage(acceptError));
    }
  }

  return (
    <Screen
      eyebrow="Investment Agreement"
      title="Investment Agreement"
      subtitle="A professional agreement summary for Founder and Angel Investor acceptance."
    >
      {isLoading ? <LoadingState label="Loading Investment Agreement" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}
      {!isLoading && !agreement ? (
        <Card>
          <Text style={styles.notice}>Investment Agreement not found.</Text>
        </Card>
      ) : null}

      {agreement ? (
        <>
          <Card>
            <Text style={styles.title}>{agreement.startupName}</Text>
            <FieldPreview label="Agreement ID" value={agreement.id} />
            <View style={styles.grid}>
              <FieldPreview label="Founder" value={agreement.founderName} />
              <FieldPreview label="Investor" value={agreement.investorName} />
              <FieldPreview label="Startup" value={agreement.startupName} />
              <FieldPreview label="Investment Amount" value={`${safeCurrency(agreement.investmentAmount)} USD`} />
              <FieldPreview label="Investor Allocation" value={safePercent(agreement.investorAllocation)} />
              <FieldPreview label="Agreement Date" value={safeDate(agreement.agreementDate)} />
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Agreement Terms</Text>
            <AgreementTerm>The Angel Investor agrees to provide funding to support the Startup.</AgreementTerm>
            <AgreementTerm>
              The Founder agrees to the investment allocation described in this agreement.
            </AgreementTerm>
            <AgreementTerm>
              Both parties acknowledge that they have reviewed the opportunity and entered this agreement voluntarily.
            </AgreementTerm>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Acceptance</Text>
            <View style={styles.acceptanceRow}>
              <AcceptanceBadge label="Founder" accepted={agreement.founderAccepted} />
              <AcceptanceBadge label="Investor" accepted={agreement.investorAccepted} />
            </View>
            <View style={styles.actions}>
              <PrimaryButton
                label="Accept As Founder"
                variant="secondary"
                onPress={() => handleAccept('founder')}
                disabled={participantRole !== 'founder' || agreement.founderAccepted}
              />
              <PrimaryButton
                label="Accept As Investor"
                variant="secondary"
                onPress={() => handleAccept('investor')}
                disabled={participantRole !== 'investor' || agreement.investorAccepted}
              />
            </View>
            {agreement.status === 'awaiting_funding' ? (
              <PrimaryButton label="Continue To Funding" onPress={() => router.push(`/payment/${agreement.id}`)} />
            ) : null}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function AgreementTerm({ children }: { children: string }) {
  return <Text style={styles.term}>{children}</Text>;
}

function AcceptanceBadge({ label, accepted }: { label: string; accepted: boolean }) {
  return (
    <View style={styles.acceptanceBadge}>
      <Text style={styles.acceptanceLabel}>{label}</Text>
      <Text style={[styles.acceptanceValue, accepted ? styles.accepted : null]}>
        {accepted ? 'Accepted' : 'Pending'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    color: colors.text,
    lineHeight: 22,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  grid: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  term: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  acceptanceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  acceptanceBadge: {
    flex: 1,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.28)',
    borderRadius: 18,
    padding: spacing.md,
    backgroundColor: colors.black,
  },
  acceptanceLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  acceptanceValue: {
    color: colors.subtle,
    fontSize: 18,
    fontWeight: '900',
  },
  accepted: {
    color: colors.success,
  },
  actions: {
    gap: spacing.sm,
  },
});
