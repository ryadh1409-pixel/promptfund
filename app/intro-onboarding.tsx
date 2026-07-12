import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { IntroOnboardingExperience } from '@/components/onboarding/IntroOnboardingExperience';
import { colors } from '@/constants/theme';

export default function IntroOnboardingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <IntroOnboardingExperience />
    </View>
  );
}
