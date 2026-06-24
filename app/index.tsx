import { Redirect } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { appRouteForProfile, shouldShowChoosePath } from '@/utils/onboarding';

export default function Index() {
  const { authUser, initializing, profile } = useAuth();

  if (initializing) {
    return null;
  }

  if (authUser && profile) {
    return <Redirect href={shouldShowChoosePath(profile) ? '/choose-path' : appRouteForProfile(profile)} />;
  }

  return <Redirect href="/login" />;
}
