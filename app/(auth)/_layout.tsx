import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { appRouteForProfile, shouldShowChoosePath, shouldShowLegalOnboarding } from '@/utils/onboarding';

export default function AuthLayout() {
  const { authUser, initializing, legalVersions, profile } = useAuth();

  if (!initializing && authUser && profile) {
    if (shouldShowLegalOnboarding(profile, legalVersions)) {
      return <Redirect href="/legal-onboarding" />;
    }
    return <Redirect href={shouldShowChoosePath(profile) ? '/choose-path' : appRouteForProfile(profile)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
