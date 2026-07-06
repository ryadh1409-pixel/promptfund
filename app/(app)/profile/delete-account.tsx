import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { firebaseAuth } from '@/firebase/auth';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { userService } from '@/services/userService';

function getFirebaseErrorDetails(error: unknown) {
  if (error && typeof error === 'object') {
    const record = error as { code?: string; message?: string };
    return {
      code: record.code ?? 'unknown',
      message: record.message ?? String(error),
    };
  }

  return {
    code: 'unknown',
    message: String(error),
  };
}

async function runDeleteAccountOperation<T>(
  operation: string,
  path: string,
  fn: () => Promise<T>,
): Promise<T> {
  console.info('[PromptFund DeleteAccount]', { operation, path, status: 'start' });
  try {
    const result = await fn();
    console.info('[PromptFund DeleteAccount]', { operation, path, status: 'success', success: true });
    return result;
  } catch (error) {
    const { code, message } = getFirebaseErrorDetails(error);
    console.error('[PromptFund DeleteAccount]', {
      operation,
      path,
      status: 'error',
      success: false,
      errorCode: code,
      errorMessage: message,
    });
    throw error;
  }
}

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { authUser } = useAuth();
  const [email, setEmail] = useState(authUser?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    if (!authUser) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await runDeleteAccountOperation(
        'reauthenticateWithCredential',
        `auth://${email.trim()}`,
        () => firebaseAuth.reauthenticate({ email: email.trim(), password }),
      );
      await userService.deleteAccount(authUser.uid);
      await runDeleteAccountOperation(
        'deleteUser',
        `auth://${authUser.uid}`,
        () => firebaseAuth.deleteCurrentUser(),
      );
      router.replace('/register');
    } catch (deleteError) {
      setError(getFriendlyErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Screen eyebrow="Data" title="Delete Account" subtitle="This action cannot be undone.">
      <Card>
        <Text style={styles.warningTitle}>Permanent deletion</Text>
        <Text style={styles.warningText}>
          This deletes your Firestore profile, profile photo, and Firebase Auth account after re-authentication.
        </Text>
        <TextInput placeholder="Email" placeholderTextColor={colors.subtle} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
        <TextInput placeholder="Password" placeholderTextColor={colors.subtle} value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <TextInput placeholder='Type "DELETE" to confirm' placeholderTextColor={colors.subtle} value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" style={styles.input} />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={isDeleting ? 'Deleting...' : 'Delete Account'}
          disabled={isDeleting || confirmation !== 'DELETE' || password.length === 0}
          onPress={handleDeleteAccount}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  warningTitle: {
    color: colors.danger,
    fontSize: 22,
    fontWeight: '900',
  },
  warningText: {
    color: colors.muted,
    lineHeight: 22,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.36)',
    borderRadius: radii.md,
    backgroundColor: colors.panelMuted,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
});
