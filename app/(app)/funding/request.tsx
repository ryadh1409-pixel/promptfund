import { StyleSheet, TextInput } from 'react-native';

import { Card, FieldPreview, PrimaryLink, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';

export default function FundingRequestScreen() {
  return (
    <Screen
      eyebrow="Funding Request"
      title="Ask for the exact tool budget you need."
      subtitle="PromptFund keeps requests small, specific, and tied to visible progress."
    >
      <Card>
        <TextInput editable={false} value="Prompt Runner" style={styles.input} />
        <TextInput editable={false} value="Claude Max" style={styles.input} />
        <TextInput editable={false} value="$100" style={styles.input} />
        <TextInput
          editable={false}
          multiline
          value="Need one month of Claude Max to run larger prompt regression suites before the investor demo."
          style={[styles.input, styles.textArea]}
        />
        <PrimaryLink href="/investor-feed" label="Post mock request" />
      </Card>

      <FieldPreview
        label="Firestore target"
        value="fundingRequests: projectId, requestedBy, amount, tool, reason, status, dueDate"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.black,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  textArea: {
    minHeight: 120,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
});
