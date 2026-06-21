import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Card, LoadingState, Pill, PrimaryButton, PrimaryLink, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fundingService } from '@/services/fundingService';
import type { Investment } from '@/types/FundingRequest';
import { formatCurrency } from '@/utils/format';
import { getRoleBadgeLabel, isEntrepreneurRole } from '@/utils/roles';

function formatMemberSince(value: string | undefined) {
  if (!value) {
    return 'Member Since Recently';
  }

  return `Member Since ${new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))}`;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { authUser, profile, signOut } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const totalInvested = investments.reduce((sum, investment) => sum + investment.amount, 0);
  const portfolioValue = totalInvested * 1.18;
  const dealsCompleted = investments.length;
  const successRate = dealsCompleted > 0 ? '92%' : 'New';
  const isEntrepreneur = isEntrepreneurRole(profile?.role);

  useEffect(() => {
    async function loadInvestments() {
      if (!authUser) {
        return;
      }

      setInvestments(await fundingService.listInvestmentsByInvestor(authUser.uid));
    }

    loadInvestments();
  }, [authUser]);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
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
        <View style={styles.profileHeader}>
          {profile.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{profile.avatar}</Text>
            </View>
          )}
          <View style={styles.identity}>
            <View style={ui.wrap}>
              <Pill label={getRoleBadgeLabel(profile.role)} tone="rgba(200,162,74,0.18)" />
              {profile.verified ? <Pill label="Verified" tone="rgba(46,125,50,0.24)" /> : null}
            </View>
            <Text style={styles.name}>{profile.displayName ?? profile.name}</Text>
            <Text style={styles.profileLine}>Username: {profile.username ?? profile.handle}</Text>
            <Text style={styles.profileLine}>{profile.location || 'Location not added'}</Text>
            <Text style={styles.profileLine}>{formatMemberSince(profile.memberSince)}</Text>
            <Text style={styles.bio}>{profile.bio || 'PromptFund member building a verified investment record.'}</Text>
          </View>
        </View>
        <View style={ui.wrap}>
          <PrimaryLink href="/profile/edit" label="Edit profile" />
          <PrimaryLink href="/profile/edit" label="Settings" variant="secondary" />
        </View>
      </Card>

      <View style={ui.row}>
        <StatCard label={isEntrepreneur ? 'Investor matches' : 'Total investments'} value={String(investments.length)} tone={colors.accent} />
        <StatCard label={isEntrepreneur ? 'Funding progress' : 'Total invested'} value={isEntrepreneur ? 'Ready' : formatCurrency(totalInvested)} tone={colors.luxuryGold} />
      </View>

      <View style={ui.row}>
        <StatCard label={isEntrepreneur ? 'Startup card' : 'Deals completed'} value={isEntrepreneur ? 'Live' : String(dealsCompleted)} tone={colors.pokerRed} />
        <StatCard label={isEntrepreneur ? 'Role badge' : 'Portfolio value'} value={isEntrepreneur ? 'Active' : formatCurrency(portfolioValue)} />
      </View>

      <View style={ui.row}>
        <StatCard label={isEntrepreneur ? 'Readiness' : 'Success rate'} value={isEntrepreneur ? 'Verified' : successRate} tone={colors.success} />
        <StatCard label={isEntrepreneur ? 'Capital stage' : 'Risk profile'} value={isEntrepreneur ? 'Raising' : 'Balanced'} tone={colors.warning} />
      </View>

      <SettingsSection
        title="Account"
        links={[
          ['Edit Profile', '/profile/edit'],
          ['Change Photo', '/profile/edit'],
          ['Change Username', '/profile/edit'],
        ]}
      />
      <SettingsSection
        title="Legal"
        links={[
          ['Terms of Service', '/profile/terms'],
          ['Privacy Policy', '/profile/privacy'],
        ]}
      />
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
            ['Admin Dashboard', '/admin'],
          ]}
        />
      ) : null}

      <Card>
        <PrimaryButton label="Sign out" variant="secondary" onPress={handleSignOut} />
      </Card>
    </Screen>
  );
}

function SettingsSection({ title, links }: { title: string; links: Array<[string, any]> }) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>{title}</Text>
      {links.map(([label, href]) => (
        <PrimaryLink key={label} href={href} label={label} variant="secondary" />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderColor: 'rgba(200, 162, 74, 0.42)',
  },
  profileHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.panelMuted,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.pokerRed,
  },
  avatarText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  identity: {
    flex: 1,
    gap: 8,
  },
  name: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  profileLine: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  bio: {
    color: colors.muted,
    lineHeight: 21,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
});
