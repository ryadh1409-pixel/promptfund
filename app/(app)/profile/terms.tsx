import { Text } from 'react-native';

import { Card, Screen } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';

export default function TermsScreen() {
  return (
    <Screen eyebrow="Legal" title="Terms of Service" subtitle="PromptFund platform terms.">
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Investment platform terms</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>
          PromptFund facilitates founder-investor introductions, agreement rooms, records, and signatures. Users are responsible for truthful profile information, lawful use, and independent investment decisions. PromptFund Witness is not a lawyer and does not provide legal advice.
        </Text>
      </Card>
    </Screen>
  );
}
