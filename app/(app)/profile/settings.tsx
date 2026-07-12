import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Card, PrimaryButton, PrimaryLink, Screen } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.info('[PromptFund Settings] sign out skipped', getFriendlyErrorMessage(error));
      router.replace('/login');
    }
  }

  return (
    <Screen eyebrow="Settings" title="Account settings" subtitle="Manage your Ai PromptFund investment identity and security.">
      <SettingsGroup title="Profile">
        <PrimaryLink href="/profile/edit" label="Edit Profile" variant="secondary" />
      </SettingsGroup>
      <SettingsGroup title="Account">
        <PrimaryLink href="/profile/download-data" label="Download My Data" variant="secondary" />
      </SettingsGroup>
      <SettingsGroup title="Notifications">
        <Text style={styles.copy}>Notification preferences will appear here when push notifications are enabled.</Text>
      </SettingsGroup>
      <SettingsGroup title="Security">
        <PrimaryLink href="/profile/delete-account" label="Delete Account" variant="secondary" />
      </SettingsGroup>
      <SettingsGroup title="Password">
        <PrimaryLink href="/reset-password" label="Reset Password" variant="secondary" />
      </SettingsGroup>
      <SettingsGroup title="Help Center">
        <PrimaryLink href="/profile/help-center" label="Open Help Center" variant="secondary" />
      </SettingsGroup>
      <SettingsGroup title="Legal">
        <PrimaryLink href="/profile/terms" label="Terms of Service" variant="secondary" />
        <PrimaryLink href="/profile/privacy" label="Privacy Policy" variant="secondary" />
        <PrimaryLink href="/profile/community-guidelines" label="Community Guidelines" variant="secondary" />
        <PrimaryLink href="/profile/investment-disclaimer" label="Investment Disclaimer" variant="secondary" />
        <PrimaryLink href="/profile/ai-disclosure" label="AI Disclosure" variant="secondary" />
      </SettingsGroup>
      <Card>
        <PrimaryButton label="Logout" variant="secondary" onPress={handleLogout} />
      </Card>
    </Screen>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <Text style={styles.title}>{title}</Text>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  copy: {
    color: colors.muted,
    lineHeight: 22,
  },
});
