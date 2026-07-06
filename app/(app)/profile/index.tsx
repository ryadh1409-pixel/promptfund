import { Link, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IdentityCard } from '@/components/cards/IdentityCard';
import { Card, LoadingState, PrimaryButton, PrimaryLink, Screen, ui } from '@/components/ui/Primitives';
import { legalDocuments } from '@/constants/legal';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { isEntrepreneurRole } from '@/utils/roles';
import { getActiveRole } from '@/utils/roles';

export default function UserProfileScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const activeRole = getActiveRole(profile);
  const isEntrepreneur = activeRole === 'founder' || isEntrepreneurRole(profile?.role);

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      router.replace('/login');
    }
  }

  if (!profile) {
    return (
      <Screen eyebrow="Profile" title="Loading profile" subtitle="Loading your card profile.">
        <LoadingState label="Loading profile" />
      </Screen>
    );
  }

  return (
    <Screen
      eyebrow="Profile"
      title={profile.displayName ?? profile.name}
      subtitle={isEntrepreneur ? 'Founder identity, startup controls, and investor readiness.' : 'Professional investment identity and account controls.'}
    >
      <View style={styles.cardStage}>
        <IdentityCard
          fullName={profile.displayName ?? profile.name}
          username={profile.username ?? profile.handle}
          role={profile.role}
          avatar={profile.avatar}
          photoURL={profile.photoURL}
          location={profile.location}
          bio={profile.bio || 'PromptFund member building a verified investment record.'}
          memberSince={profile.memberSince}
        />
      </View>
      <View style={ui.wrap}>
        <PrimaryLink href="/profile/edit" label="Edit profile" />
      </View>
      <Card>
        <Text style={styles.sectionTitle}>Change Role</Text>
        <Text style={styles.settingsCopy}>Current role: {activeRole === 'founder' ? 'Founder' : 'Angel Investor'}</Text>
        <PrimaryButton label="Change Role" variant="secondary" onPress={() => router.push('/choose-path')} />
      </Card>
      <LegalSettingsSection />
      <SettingsSection
        title="Safety"
        links={[
          ['Blocked Users', '/profile/blocked-users'],
          ['Report a User', '/profile/report-user'],
        ]}
      />
      <SupportSection />

      {profile.role === 'admin' ? (
        <SettingsSection
          title="Admin"
          links={[
            ['Admin Console', '/admin'],
          ]}
        />
      ) : null}

      <SettingsSection
        title="Account"
        links={[
          ['Delete Account', '/profile/delete-account'],
        ]}
      />

      <Card>
        <PrimaryButton label="Sign out" variant="secondary" onPress={handleSignOut} />
      </Card>
    </Screen>
  );
}

function SettingsSection({ title, links }: { title: string; links: Array<[string, Href]> }) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>{title}</Text>
      {links.map(([label, href]) => (
        <PrimaryLink key={label} href={href} label={label} variant="secondary" />
      ))}
    </Card>
  );
}

function LegalSettingsSection() {
  const links: Array<[string, Href, string]> = [
    [legalDocuments.terms.title, '/profile/terms', legalDocuments.terms.preview],
    [legalDocuments.privacy.title, '/profile/privacy', legalDocuments.privacy.preview],
    [legalDocuments.community.title, '/profile/community-guidelines', legalDocuments.community.preview],
    [legalDocuments.investmentDisclaimer.title, '/profile/investment-disclaimer', legalDocuments.investmentDisclaimer.preview],
  ];

  return (
    <Card style={styles.legalCard}>
      <Text style={styles.sectionTitle}>Legal</Text>
      <View style={styles.legalRows}>
        {links.map(([label, href, preview]) => (
          <Link key={label} href={href} asChild>
            <Pressable accessibilityRole="button" style={styles.legalRow}>
              <View style={styles.legalTextBlock}>
                <Text style={styles.legalTitle}>{label}</Text>
                <Text style={styles.legalPreview}>{preview}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </Card>
  );
}

function SupportSection() {
  return (
    <Card style={styles.legalCard}>
      <Text style={styles.sectionTitle}>Support</Text>
      <View style={styles.legalRows}>
        <Link href="/profile/contact-support" asChild>
          <Pressable accessibilityRole="button" style={styles.legalRow}>
            <View style={styles.legalTextBlock}>
              <Text style={styles.legalTitle}>Contact PromptFund Support</Text>
              <Text style={styles.legalPreview}>Send a message to our team. We typically respond within 24 hours.</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </Link>
        <Link href="/profile/support-tickets" asChild>
          <Pressable accessibilityRole="button" style={styles.legalRow}>
            <View style={styles.legalTextBlock}>
              <Text style={styles.legalTitle}>My Support Tickets</Text>
              <Text style={styles.legalPreview}>View status and replies from PromptFund Support.</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </Link>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardStage: {
    alignItems: 'center',
    width: '100%',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  settingsCopy: {
    color: colors.muted,
    lineHeight: 22,
  },
  legalCard: {
    gap: spacing.md,
  },
  legalRows: {
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.14)',
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.black,
  },
  legalRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 201, 163, 0.1)',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  legalTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  legalTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  legalPreview: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    color: colors.luxuryGold,
    fontSize: 26,
    fontWeight: '700',
  },
});
