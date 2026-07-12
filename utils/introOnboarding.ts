import AsyncStorage from '@react-native-async-storage/async-storage';

const INTRO_ONBOARDING_COMPLETE_KEY = 'ai_promptfund_intro_onboarding_complete';

export async function hasCompletedIntroOnboarding() {
  const value = await AsyncStorage.getItem(INTRO_ONBOARDING_COMPLETE_KEY);
  return value === 'true';
}

export async function markIntroOnboardingComplete() {
  await AsyncStorage.setItem(INTRO_ONBOARDING_COMPLETE_KEY, 'true');
}
