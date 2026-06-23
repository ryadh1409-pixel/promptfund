import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Card, FieldPreview, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, spacing } from '@/constants/theme';
import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import type { InvestmentAgreement } from '@/types/InvestmentFlow';
import { safeCurrency, safePercent } from '@/utils/safeFormat';

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [agreement, setAgreement] = useState<InvestmentAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

  async function handleInvest() {
    if (!agreement) {
      return;
    }

    setIsPaying(true);
    setNotice(null);

    try {
      await investmentFlowService.completePayment(agreement);
      router.replace('/deck');
    } catch (paymentError) {
      setNotice(getFriendlyErrorMessage(paymentError));
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <Screen
      eyebrow="Investment Funding"
      title="Complete Investment"
      subtitle="Mock funding is enabled for V6. Stripe integration comes later."
    >
      {isLoading ? <LoadingState label="Loading payment details" /> : null}
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
            <FieldPreview label="Founder" value={agreement.founderName} />
            <FieldPreview label="Investment Amount" value={`${safeCurrency(agreement.investmentAmount)} USD`} />
            <FieldPreview label="Investor Allocation" value={safePercent(agreement.investorAllocation)} />
          </Card>

          <Card>
            <Text style={styles.amount}>$22 USD</Text>
            <Text style={styles.copy}>
              Send the mock investment to activate funding for the Founder and the Angel Investor.
            </Text>
            <PrimaryButton
              label={isPaying ? 'Sending Investment...' : 'Send Investment'}
              onPress={handleInvest}
              disabled={isPaying || agreement.status !== 'awaiting_funding'}
            />
          </Card>
        </>
      ) : null}
    </Screen>
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
  amount: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
