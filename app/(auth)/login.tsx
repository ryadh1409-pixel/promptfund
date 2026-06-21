import { Link } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, FieldPreview, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { error, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    await signIn({ email: email.trim(), password });
    router.replace('/investor-feed');
  }

  return (
    <Screen
      eyebrow="PromptFund"
      title="Discover. Swipe. Invest."
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
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={loading ? 'Signing in...' : 'Start swiping'}
          disabled={loading || email.length === 0 || password.length === 0}
          onPress={handleLogin}
        />
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
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
});
