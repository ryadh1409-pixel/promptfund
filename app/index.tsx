import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { appRouteForProfile, shouldShowChoosePath } from '@/utils/onboarding';
import { hasCompletedIntroOnboarding } from '@/utils/introOnboarding';

export default function Index() {
  const { authUser, initializing, profile } = useAuth();
  const [introReady, setIntroReady] = useState(false);
  const [introComplete, setIntroComplete] = useState(true);

  useEffect(() => {
    let mounted = true;
    hasCompletedIntroOnboarding()
      .then((complete) => {
        if (mounted) {
          setIntroComplete(complete);
          setIntroReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setIntroComplete(true);
          setIntroReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!introReady || initializing) {
    return null;
  }

  if (!introComplete) {
    return <Redirect href="/intro-onboarding" />;
  }

  if (authUser && profile) {
    return <Redirect href={shouldShowChoosePath(profile) ? '/choose-path' : appRouteForProfile(profile)} />;
  }

  return <Redirect href="/login" />;
}
