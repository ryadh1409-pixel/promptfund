import { Link, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IdentityCard } from '@/components/cards/IdentityCard';
import { BlockUserControl } from '@/components/safety/BlockUserControl';
import { Card, LoadingState, Pill, PrimaryButton, PrimaryLink, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { legalDocuments } from '@/constants/legal';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fundingService } from '@/services/fundingService';
import type { Investment } from '@/types/FundingRequest';
import { formatCurrency } from '@/utils/format';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { getRoleBadgeLabel, isEntrepreneurRole } from '@/utils/roles';
import { getActiveRole } from '@/utils/roles';

export default function UserProfileScreen() {
  const router = useRouter();
  const { authUser, profile, signOut } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const totalInvested = investments.reduce((sum, investment) => sum + investment.amount, 0);
  const portfolioValue = totalInvested * 1.18;
  const dealsCompleted = investments.length;
  const successRate = dealsCompleted > 0 ? '92%' : 'New';
  const activeRole = getActiveRole(profile);
  const isEntrepreneur = activeRole === 'founder' || isEntrepreneurRole(profile?.role);

  useEffect(() => {
    async function loadInvestments() {
      if (!authUser?.uid) {
        return;
      }

      try {
        setError(null);
        setInvestments(await fundingService.listInvestmentsByInvestor(authUser.uid));
      } catch (loadError) {
        setError(getFriendlyErrorMessage(loadError));
      }
    }

    loadInvestments();
  }, [authUser?.uid]);

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
      <Card style={styles.heroCard}>
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
        <View style={ui.wrap}>
          <PrimaryLink href="/profile/edit" label="Edit profile" />
          <PrimaryLink href="/profile/settings" label="Settings" variant="secondary" />
        </View>
      </Card>
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <View style={ui.row}>
        <StatCard label={isEntrepreneur ? 'Investor matches' : 'Total investments'} value={String(investments.length)} tone={colors.accent} />
        <StatCard label={isEntrepreneur ? 'Funding progress' : 'Total invested'} value={isEntrepreneur ? 'Ready' : formatCurrency(totalInvested)} tone={colors.luxuryGold} />
      </View>

      <View style={ui.row}>
        <StatCard label={isEntrepreneur ? 'Startup card' : 'Deal Cards'} value={isEntrepreneur ? 'Live' : String(dealsCompleted)} tone={colors.pokerRed} />
        <StatCard label={isEntrepreneur ? 'Role badge' : 'Card Value'} value={isEntrepreneur ? 'Active' : formatCurrency(portfolioValue)} />
      </View>

      <View style={ui.row}>
        <StatCard label={isEntrepreneur ? 'Readiness' : 'Success rate'} value={isEntrepreneur ? 'Verified' : successRate} tone={colors.success} />
        <StatCard label={isEntrepreneur ? 'Capital stage' : 'Risk profile'} value={isEntrepreneur ? 'Raising' : 'Balanced'} tone={colors.warning} />
      </View>

      <SettingsSection
        title="Account"
        links={[
          ['Edit Profile', '/profile/edit'],
        ]}
      />
      <Card>
        <Text style={styles.sectionTitle}>Verification</Text>
        <Text style={styles.settingsCopy}>Identity, role, and agreement verification are represented through PromptFund cards.</Text>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Change Role</Text>
        <Text style={styles.settingsCopy}>Current role: {activeRole === 'founder' ? 'Founder' : 'Angel Investor'}</Text>
        <PrimaryButton label="Change Role" variant="secondary" onPress={() => router.push('/choose-path')} />
      </Card>
      <BlockUserControl
        currentUserId={authUser?.uid}
        targetUserId={profile.id}
        currentUser={profile}
        targetUser={profile}
        targetName={profile.displayName ?? profile.name}
      />
      <SettingsSection
        title="Settings"
        links={[
          ['Settings', '/profile/settings'],
          ['Help Center', '/profile/help-center'],
        ]}
      />
      <LegalSettingsSection />
      <SettingsSection
        title="Safety"
        links={[
          ['Blocked Users', '/profile/blocked-users'],
          ['Report a User', '/profile/report-user'],
        ]}
      />
      <SettingsSection
        title="Data"
        links={[
          ['Download My Data', '/profile/download-data'],
          ['Delete Account', '/profile/delete-account'],
        ]}
      />
      <SettingsSection
        title="Support"
        links={[
          ['Contact Support', '/profile/contact-support'],
          ['Help Center', '/profile/help-center'],
        ]}
      />

      {profile.role === 'admin' ? (
        <SettingsSection
          title="Admin"
          links={[
            ['Admin Console', '/admin'],
          ]}
        />
      ) : null}

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
    [legalDocuments.aiDisclosure.title, '/profile/ai-disclosure', legalDocuments.aiDisclosure.preview],
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

const styles = StyleSheet.create({
  heroCard: {
    borderColor: 'rgba(200, 162, 74, 0.42)',
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
  errorText: {
    color: colors.danger,
    lineHeight: 22,
  },
});
