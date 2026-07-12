import { Text } from 'react-native';

import { Card, Screen } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';

export default function HelpCenterScreen() {
  return (
    <Screen eyebrow="Support" title="Help Center" subtitle="Ai PromptFund account, safety, and agreement guidance.">
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Common workflows</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>
          Edit your profile from Account settings, block unsafe users from Safety, report abuse for admin review, and use Agreement Rooms for recorded founder-investor decisions.
        </Text>
      </Card>
    </Screen>
  );
}
