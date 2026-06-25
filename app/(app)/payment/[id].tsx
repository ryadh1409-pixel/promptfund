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

  useEffect(() => {
    if (!agreement || !authUser?.uid || agreement.status !== 'awaiting_funding') {
      return;
    }

    investmentFlowService.recordFundingInstructionsOpened(agreement, authUser.uid).catch((error) => {
      console.info('[PromptFund Timeline] funding instructions event failed', error);
    });
  }, [agreement, authUser?.uid]);

  async function handleFundingArranged() {
    if (!agreement) {
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      await investmentFlowService.markFundingArrangedOutsidePromptFund(agreement);
      setNotice('Funding arrangements marked as completed outside PromptFund. Waiting for Founder confirmation.');
    } catch (fundingError) {
      setNotice(getFriendlyErrorMessage(fundingError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmArrangement() {
    if (!agreement) {
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      await investmentFlowService.confirmFundingArrangement(agreement);
      setNotice('Funding agreement completed.');
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
  const canViewContact = agreement?.founderAccepted === true
    && agreement?.investorAccepted === true
    && founderProfile?.shareFundingContactInfo === true;
  const isAwaitingInvestor = agreement?.status === 'awaiting_funding';
  const isFundingArranged = agreement?.status === 'funding_arranged';
  const isCompleted = agreement?.status === 'completed';

  return (
    <Screen
      eyebrow="Investment Funding"
      title={isCompleted ? 'Funding Agreement Completed' : 'Funding Instructions'}
      subtitle="PromptFund is only a matching and agreement platform between founders and investors."
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
            <Text style={styles.sectionTitle}>Founder Contact</Text>
            {canViewContact && payoutDetails.length > 0 ? (
              <View style={styles.grid}>
                {payoutDetails.map((detail) => (
                  <FieldPreview key={detail.label} label={detail.label} value={detail.value} />
                ))}
              </View>
            ) : (
              <Text style={styles.copy}>No contact information has been shared yet.</Text>
            )}
            {agreement.discussionRoomId ? (
              <PrimaryButton label="Continue Discussion" variant="secondary" onPress={() => router.push(`/discussion-room/${agreement.discussionRoomId}`)} />
            ) : null}
          </Card>

          <Card>
            <Text style={styles.disclaimer}>
              PromptFund is not involved in the transfer of funds. Founders and investors arrange funding directly
              outside the app.
            </Text>
          </Card>

          {!isCompleted ? (
            <Card>
              <Text style={styles.sectionTitle}>Arrangement Status</Text>
              {participantRole === 'investor' ? (
                <>
                  <Text style={styles.copy}>
                    Arrange funding directly with the Founder outside PromptFund, then confirm the arrangement here.
                  </Text>
                  <PrimaryButton
                    label={isSaving ? 'Saving...' : 'I Have Arranged Funding Outside PromptFund'}
                    onPress={handleFundingArranged}
                    disabled={isSaving || !isAwaitingInvestor}
                  />
                  {isFundingArranged ? <Text style={styles.copy}>Waiting for Founder confirmation.</Text> : null}
                </>
              ) : null}

              {participantRole === 'founder' ? (
                <>
                  <Text style={styles.copy}>
                    {isFundingArranged
                      ? 'Investor has indicated that funding arrangements were completed outside PromptFund.'
                      : 'Waiting for the Investor to indicate that funding arrangements were completed outside PromptFund.'}
                  </Text>
                  <PrimaryButton
                    label={isSaving ? 'Confirming...' : 'Confirm Arrangement'}
                    onPress={handleConfirmArrangement}
                    disabled={isSaving || !isFundingArranged}
                  />
                  <PrimaryButton
                    label="Report Issue"
                    variant="secondary"
                    onPress={() => setNotice('Issue reported. PromptFund support will review the agreement issue.')}
                  />
                </>
              ) : null}
            </Card>
          ) : (
            <Card>
              <Text style={styles.sectionTitle}>Funding Agreement Completed</Text>
              <View style={styles.grid}>
                <FieldPreview label="Startup" value={agreement.startupName} />
                <FieldPreview label="Founder" value={agreement.founderName} />
                <FieldPreview label="Investor" value={agreement.investorName} />
                <FieldPreview label="Amount" value={`${safeCurrency(agreement.investmentAmount)} USD`} />
                <FieldPreview label="Allocation" value={safePercent(agreement.investorAllocation)} />
                <FieldPreview label="Completion Date" value={safeDate(agreement.completedAt ?? agreement.updatedAt)} />
              </View>
              <Text style={styles.disclaimer}>
                PromptFund did not process or handle any funds related to this agreement.
              </Text>
              <PrimaryButton label="Back To My Cards" onPress={() => router.replace('/deck')} />
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function formatPayoutDetails(profile: User | null) {
  if (!profile) {
    return [];
  }

  return [
    profile.email ? { label: 'Email', value: profile.email } : null,
    profile.phone ? { label: 'Phone', value: profile.phone } : null,
    profile.linkedIn ? { label: 'LinkedIn', value: profile.linkedIn } : null,
    profile.website ? { label: 'Website', value: profile.website } : null,
  ].filter((detail): detail is { label: string; value: string } => detail !== null);
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
