import { Link } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/User';

export default function RegisterScreen() {
  const router = useRouter();
  const { error, loading, register } = useAuth();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('developer');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [stack, setStack] = useState('');

  async function handleRegister() {
    const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const avatar = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    await register({
      email: email.trim(),
      password,
      displayName: name.trim(),
      name: name.trim(),
      handle: normalizedHandle,
      role,
      avatar: avatar || 'PF',
      bio: bio.trim(),
      location: location.trim(),
      stack: stack
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
    router.replace(role === 'developer' ? '/projects/create' : '/investor-feed');
  }

  return (
    <Screen
      eyebrow="Create profile"
      title="Founders create cards. Investors swipe them."
      subtitle="Keep it simple. Your profile only supports the card experience."
    >
      <Card>
        <TextInput
          placeholder="Full name"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          placeholder="Handle"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value={handle}
          autoCapitalize="none"
          onChangeText={setHandle}
        />
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
        <TextInput
          placeholder="Role: developer or investor"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value={role}
          autoCapitalize="none"
          onChangeText={(value) => setRole(value === 'investor' ? 'investor' : 'developer')}
        />
        <TextInput
          placeholder="Location"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value={location}
          onChangeText={setLocation}
        />
        <TextInput
          placeholder="What are you building?"
          placeholderTextColor={colors.subtle}
          multiline
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
        />
        <TextInput
          placeholder="Stack, separated by commas"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value={stack}
          onChangeText={setStack}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={loading ? 'Creating profile...' : 'Create profile'}
          disabled={loading || name.length === 0 || email.length === 0 || password.length === 0}
          onPress={handleRegister}
        />
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already registered?</Text>
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
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
});
