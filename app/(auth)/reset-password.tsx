import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { firebaseAuth } from '@/firebase/auth';
import { getFriendlyErrorMessage } from '@/services/errorHandler';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleResetPassword() {
    const normalizedEmail = email.trim();
    setError(null);
    setSuccess(false);

    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setIsSending(true);
    try {
      await firebaseAuth.sendPasswordReset(normalizedEmail);
      setSuccess(true);
    } catch (resetError) {
      setError(getFriendlyErrorMessage(resetError));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Screen
      eyebrow="Account Recovery"
      title="Reset your password"
      subtitle="Enter the email connected to your PromptFund account."
    >
      <Card>
        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />
        {success ? <Text style={styles.successText}>Password reset link sent to your email.</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={isSending ? 'Sending reset link...' : 'Send reset link'}
          disabled={isSending || email.length === 0}
          onPress={handleResetPassword}
        />
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Remembered your password?</Text>
          <Link href="/login" asChild>
            <Text style={styles.footerLink}>Sign in</Text>
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
  successText: {
    color: colors.success,
    lineHeight: 20,
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
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
