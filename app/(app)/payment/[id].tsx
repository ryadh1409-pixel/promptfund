import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, FieldPreview, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import { userService } from '@/services/userService';
import type { InvestmentAgreement } from '@/types/InvestmentFlow';
import type { User } from '@/types/User';
import { safeCurrency, safeDate, safePercent } from '@/utils/safeFormat';

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authUser } = useAuth();
  const [agreement, setAgreement] = useState<InvestmentAgreement | null>(null);
  const [founderProfile, setFounderProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    if (!agreement?.founderId) {
      setFounderProfile(null);
      return;
    }

    let isMounted = true;
    userService
      .getUserById(agreement.founderId)
      .then((founder) => {
        if (isMounted) {
          setFounderProfile(founder);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setNotice(getFriendlyErrorMessage(error));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [agreement?.founderId]);

  async function handleInvestorSentFunding() {
    if (!agreement) {
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      await investmentFlowService.markInvestorSentFunding(agreement);
      setNotice('Funding marked as sent. Waiting for Founder confirmation.');
    } catch (fundingError) {
      setNotice(getFriendlyErrorMessage(fundingError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmFundingReceived() {
    if (!agreement) {
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      await investmentFlowService.confirmFundingReceived(agreement);
      setNotice('Funding received and recorded.');
    } catch (fundingError) {
      setNotice(getFriendlyErrorMessage(fundingError));
    } finally {
      setIsSaving(false);
    }
  }

  const participantRole = authUser?.uid === agreement?.founderId
    ? 'founder'
    : authUser?.uid === agreement?.investorId
      ? 'investor'
      : null;
  const payoutDetails = formatPayoutDetails(founderProfile);
  const isAwaitingInvestor = agreement?.status === 'awaiting_funding';
  const isInvestorSent = agreement?.status === 'investor_sent';
  const isFunded = agreement?.status === 'funded';

  return (
    <Screen
      eyebrow="Investment Funding"
      title={isFunded ? 'Funding Received' : 'Funding Instructions'}
      subtitle="Funding is completed directly between the Founder and Angel Investor."
    >
      {isLoading ? <LoadingState label="Loading funding details" /> : null}
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
            <View style={styles.grid}>
              <FieldPreview label="Startup Name" value={agreement.startupName} />
              <FieldPreview label="Founder Name" value={agreement.founderName} />
              <FieldPreview label="Investor Name" value={agreement.investorName} />
              <FieldPreview label="Funding Amount" value={`${safeCurrency(agreement.investmentAmount)} USD`} />
              <FieldPreview label="Equity Allocation" value={safePercent(agreement.investorAllocation)} />
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Founder Payout Details</Text>
            {payoutDetails.length > 0 ? (
              <View style={styles.grid}>
                {payoutDetails.map((detail) => (
                  <FieldPreview key={detail.label} label={detail.label} value={detail.value} />
                ))}
              </View>
            ) : (
              <Text style={styles.copy}>No founder payout details are available yet.</Text>
            )}
          </Card>

          <Card>
            <Text style={styles.disclaimer}>
              PromptFund does not process, hold, or transfer funds. Funding is completed directly between the
              founder and investor.
            </Text>
          </Card>

          {!isFunded ? (
            <Card>
              <Text style={styles.sectionTitle}>Funding Status</Text>
              {participantRole === 'investor' ? (
                <>
                  <Text style={styles.copy}>
                    Send funding directly using the Founder payout details above, then mark it as sent.
                  </Text>
                  <PrimaryButton
                    label={isSaving ? 'Saving...' : 'I Sent Funding'}
                    onPress={handleInvestorSentFunding}
                    disabled={isSaving || !isAwaitingInvestor}
                  />
                  {isInvestorSent ? <Text style={styles.copy}>Waiting for Founder confirmation.</Text> : null}
                </>
              ) : null}

              {participantRole === 'founder' ? (
                <>
                  <Text style={styles.copy}>
                    {isInvestorSent
                      ? 'Investor marked funding as sent.'
                      : 'Waiting for the Investor to mark funding as sent.'}
                  </Text>
                  <PrimaryButton
                    label={isSaving ? 'Confirming...' : 'Confirm Funding Received'}
                    onPress={handleConfirmFundingReceived}
                    disabled={isSaving || !isInvestorSent}
                  />
                  <PrimaryButton
                    label="Report Issue"
                    variant="secondary"
                    onPress={() => setNotice('Issue reported. PromptFund support will review this funding status.')}
                  />
                </>
              ) : null}
            </Card>
          ) : (
            <Card>
              <Text style={styles.sectionTitle}>Funding Received</Text>
              <View style={styles.grid}>
                <FieldPreview label="Amount" value={`${safeCurrency(agreement.investmentAmount)} USD`} />
                <FieldPreview label="Allocation" value={safePercent(agreement.investorAllocation)} />
                <FieldPreview label="Date" value={safeDate(agreement.fundedAt ?? agreement.updatedAt)} />
                <FieldPreview label="Founder" value={agreement.founderName} />
                <FieldPreview label="Investor" value={agreement.investorName} />
                <FieldPreview label="Status" value="Funding Received" />
              </View>
              <PrimaryButton label="Back To My Cards" onPress={() => router.replace('/deck')} />
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function formatPayoutDetails(profile: User | null) {
  if (!profile?.preferredPayoutMethod) {
    return [];
  }

  if (profile.preferredPayoutMethod === 'interac' && profile.interacEmail) {
    return [
      { label: 'Payout Method', value: 'Interac e-Transfer' },
      { label: 'Interac Email', value: profile.interacEmail },
    ];
  }

  if (profile.preferredPayoutMethod === 'wise' && profile.wiseEmail) {
    return [
      { label: 'Payout Method', value: 'Wise' },
      { label: 'Wise Email', value: profile.wiseEmail },
    ];
  }

  if (profile.preferredPayoutMethod === 'paypal' && profile.paypalEmail) {
    return [
      { label: 'Payout Method', value: 'PayPal' },
      { label: 'PayPal Email', value: profile.paypalEmail },
    ];
  }

  if (profile.preferredPayoutMethod === 'bank') {
    return [
      { label: 'Payout Method', value: 'Bank Transfer' },
      { label: 'Bank Name', value: profile.bankName ?? 'Not provided' },
      { label: 'Account Holder', value: profile.accountHolderName ?? 'Not provided' },
      { label: 'Account Last 4', value: profile.accountLast4 ? `•••• ${profile.accountLast4}` : 'Not provided' },
    ];
  }

  return [];
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
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  grid: {
    gap: spacing.md,
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  disclaimer: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 22,
  },
});
