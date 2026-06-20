import { Link } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryLink, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';

export default function RegisterScreen() {
  return (
    <Screen
      eyebrow="Create profile"
      title="Join as a builder or backer."
      subtitle="Set up the public profile investors use to evaluate funding requests and developer progress."
    >
      <Card>
        <TextInput
          placeholder="Full name"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value="Maya Chen"
          editable={false}
        />
        <TextInput
          placeholder="Role"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value="Developer"
          editable={false}
        />
        <TextInput
          placeholder="What are you building?"
          placeholderTextColor={colors.subtle}
          multiline
          style={[styles.input, styles.textArea]}
          value="AI workflow tools for product teams."
          editable={false}
        />
        <PrimaryLink href="/dashboard" label="Create mock account" />
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already registered?</Text>
          <Link href="/login" style={styles.footerLink}>
            Sign in
          </Link>
        </View>
      </Card>
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
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
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
