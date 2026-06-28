import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { Card, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { legalDocuments } from '@/constants/legal';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { legalService } from '@/services/legalService';
import { appRouteForProfile, shouldShowChoosePath } from '@/utils/onboarding';

const onboardingSteps = [
  'Welcome',
  'Terms',
  'Privacy',
  'Community',
  'Disclaimer',
  'AI',
  'Accept',
] as const;

export default function LegalOnboardingScreen() {
  const { authUser, legalVersions, profile, refreshLegalVersions, refreshProfile } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const step = onboardingSteps[stepIndex];
  const progressLabel = `${stepIndex + 1} of ${onboardingSteps.length}`;
  const canGoBack = stepIndex > 0;
  const canContinue = step !== 'Accept' || hasAccepted;

  const body = useMemo(() => {
    if (step === 'Welcome') {
      return (
        <Card style={styles.heroCard}>
          <Text style={styles.heroTitle}>Welcome to PromptFund</Text>
          <Text style={styles.heroCopy}>
            PromptFund connects founders and angel investors through professional startup cards, private investment discussions, and post-investment collaboration tools.
          </Text>
        </Card>
      );
    }
    if (step === 'Terms') return <LegalDocumentView document={legalDocuments.terms} showUnderstandButton={false} />;
    if (step === 'Privacy') return <LegalDocumentView document={legalDocuments.privacy} showUnderstandButton={false} />;
    if (step === 'Community') return <LegalDocumentView document={legalDocuments.community} showUnderstandButton={false} />;
    if (step === 'Disclaimer') return <LegalDocumentView document={legalDocuments.investmentDisclaimer} showUnderstandButton={false} />;
    if (step === 'AI') return <LegalDocumentView document={legalDocuments.aiDisclosure} showUnderstandButton={false} />;

    return (
      <Card style={styles.heroCard}>
        <Text style={styles.heroTitle}>Accept PromptFund Legal Documents</Text>
        <Text style={styles.heroCopy}>Review and accept the documents below to continue into PromptFund.</Text>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: hasAccepted }} onPress={() => setHasAccepted((current) => !current)} style={styles.checkboxRow}>
          <View style={[styles.checkbox, hasAccepted ? styles.checkboxChecked : null]}>
            <Text style={styles.checkboxMark}>{hasAccepted ? '✓' : ''}</Text>
          </View>
          <View style={styles.acceptTextBlock}>
            <Text style={styles.acceptText}>I have read and agree to:</Text>
            <Text style={styles.acceptList}>Terms of Service</Text>
            <Text style={styles.acceptList}>Privacy Policy</Text>
            <Text style={styles.acceptList}>Community Guidelines</Text>
            <Text style={styles.acceptList}>Investment Disclaimer</Text>
            <Text style={styles.acceptList}>AI Disclosure</Text>
          </View>
        </Pressable>
      </Card>
    );
  }, [hasAccepted, step]);

  async function handleContinue() {
    if (step !== 'Accept') {
      setStepIndex((current) => Math.min(current + 1, onboardingSteps.length - 1));
      return;
    }

    if (!authUser?.uid || !profile || !legalVersions || !hasAccepted) {
      return;
    }

    try {
      setIsSaving(true);
      setNotice(null);
      const versions = await refreshLegalVersions();
      await legalService.acceptLegal(authUser.uid, versions);
      await refreshProfile();
      router.replace(shouldShowChoosePath(profile) ? '/choose-path' : appRouteForProfile(profile));
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (!profile || !legalVersions) {
    return (
      <Screen eyebrow="Legal" title="Preparing legal onboarding">
        <LoadingState label="Loading legal documents" />
      </Screen>
    );
  }

  return (
    <Screen eyebrow="Legal Onboarding" title={step === 'Welcome' ? 'Welcome' : String(step)} subtitle={`Step ${progressLabel}`}>
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}
      <ScrollView style={styles.documentScroll} nestedScrollEnabled>
        {body}
      </ScrollView>
      <View style={styles.actions}>
        {canGoBack ? <PrimaryButton label="Back" variant="secondary" onPress={() => setStepIndex((current) => Math.max(current - 1, 0))} disabled={isSaving} /> : null}
        <PrimaryButton
          label={step === 'Accept' ? (isSaving ? 'Saving...' : 'Accept & Continue') : 'Continue'}
          onPress={handleContinue}
          disabled={!canContinue || isSaving}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  documentScroll: {
    maxHeight: 520,
  },
  heroCard: {
    gap: spacing.md,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  heroCopy: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
  },
  checkboxRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.black,
  },
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: 8,
  },
  checkboxChecked: {
    backgroundColor: colors.luxuryGold,
  },
  checkboxMark: {
    color: colors.black,
    fontSize: 17,
    fontWeight: '900',
  },
  acceptTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  acceptText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  acceptList: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    gap: spacing.sm,
  },
  notice: {
    color: colors.danger,
    lineHeight: 22,
  },
});
