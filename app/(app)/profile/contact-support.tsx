import { Linking, Text } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';

export default function ContactSupportScreen() {
  return (
    <Screen eyebrow="Support" title="Contact Support" subtitle="Get help from PromptFund operations.">
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Support channel</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>
          For profile, safety, agreement, or admin issues, contact PromptFund support with your account email and agreement ID.
        </Text>
        <PrimaryButton label="Email Support" onPress={() => Linking.openURL('mailto:support@promptfund.app')} />
      </Card>
    </Screen>
  );
}
