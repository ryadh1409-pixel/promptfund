import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, FieldPreview, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';

export default function LoginScreen() {
  const { error, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleLogin() {
    setLocalError(null);
    try {
      await signIn({ email: email.trim(), password });
    } catch (loginError) {
      setLocalError(getFriendlyErrorMessage(loginError));
    }
  }

  return (
    <Screen
      eyebrow="PromptFund"
      title="Swipe. Match. Fund."
      subtitle="Investors swipe startup cards. Founders create one card and meet investors."
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
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.subtle}
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
        {localError || error ? <Text style={styles.errorText}>{localError ?? error}</Text> : null}
        <PrimaryButton
          label={loading ? 'Signing in...' : 'Start swiping'}
          disabled={loading || email.length === 0 || password.length === 0}
          onPress={handleLogin}
        />
        <Link href="/reset-password" asChild>
          <Text style={styles.forgotLink}>Forgot Password?</Text>
        </Link>
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New to PromptFund?</Text>
          <Link href="/register" asChild>
            <Text style={styles.footerLink}>Create account</Text>
          </Link>
        </View>
      </Card>

      <FieldPreview label="PromptFund V2" value="Startup investing through cards." />
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
  forgotLink: {
    color: colors.luxuryGold,
    fontWeight: '900',
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
});
