import { Text } from 'react-native';

import { Card, Screen } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';

export default function PrivacyScreen() {
  return (
    <Screen eyebrow="Legal" title="Privacy Policy" subtitle="How PromptFund handles account and agreement data.">
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Privacy commitments</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>
          PromptFund stores profile, investment, agreement, transcript, signature, and safety records in Firebase. Agreement artifacts are private to authorized parties and admins. Profile photos are stored under users/&lt;uid&gt;/profile.jpg.
        </Text>
      </Card>
    </Screen>
  );
}
