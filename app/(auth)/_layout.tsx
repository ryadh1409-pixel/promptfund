import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { appRouteForProfile, shouldShowChoosePath } from '@/utils/onboarding';

export default function AuthLayout() {
  const { authUser, initializing, profile } = useAuth();

  if (!initializing && authUser && profile) {
    return <Redirect href={shouldShowChoosePath(profile) ? '/choose-path' : appRouteForProfile(profile)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
