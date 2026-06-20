import { Link } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, FieldPreview, PrimaryLink, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';

export default function LoginScreen() {
  return (
    <Screen
      eyebrow="PromptFund"
      title="Fund the tools that ship the next product."
      subtitle="Developers request small AI-tool budgets. Investors back builders and track what ships."
    >
      <Card>
        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value="maya@promptfund.dev"
          editable={false}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.subtle}
          secureTextEntry
          style={styles.input}
          value="promptfund-preview"
          editable={false}
        />
        <PrimaryLink href="/dashboard" label="Enter PromptFund" />
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New to PromptFund?</Text>
          <Link href="/register" asChild>
            <Text style={styles.footerLink}>Create account</Text>
          </Link>
        </View>
      </Card>

      <FieldPreview
        label="Product preview"
        value="PromptFund Auth and Firestore collections are represented with local preview data until Firebase is connected."
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footerText: {
    color: colors.muted,
  },
  footerLink: {
    color: colors.accent,
    fontWeight: '800',
  },
});
