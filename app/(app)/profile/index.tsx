import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Card, LoadingState, Pill, PrimaryButton, Screen, SectionTitle, StatCard, ui } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { projectService } from '@/services/projectService';
import type { Project } from '@/types/Project';

export default function UserProfileScreen() {
  const router = useRouter();
  const { authUser, profile, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    async function loadProjects() {
      if (!authUser) {
        return;
      }

      setProjects(await projectService.listProjectsByDeveloper(authUser.uid));
    }

    loadProjects();
  }, [authUser]);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  if (!profile) {
    return (
      <Screen eyebrow="User Profile" title="Loading profile" subtitle="Loading your PromptFund profile from Firestore.">
        <LoadingState label="Loading profile" />
      </Screen>
    );
  }

  return (
    <Screen
      eyebrow="User Profile"
      title={profile.name}
      subtitle={`${profile.handle} · ${profile.location}`}
    >
      <Card>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900' }}>{profile.avatar}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{profile.role}</Text>
          <Text style={{ color: colors.muted, lineHeight: 21, textAlign: 'center' }}>{profile.bio}</Text>
        </View>
      </Card>

      <View style={ui.row}>
        <StatCard label="Trust score" value={`${profile.trustScore}`} tone={colors.success} />
        <StatCard label="Projects" value={String(projects.length)} tone={colors.accent} />
      </View>

      <SectionTitle title="Stack and needs" />
      <Card>
        <View style={ui.wrap}>
          {profile.stack.map((item) => (
            <Pill key={item} label={item} />
          ))}
        </View>
      </Card>

      <SectionTitle title="Public proof" />
      <Card>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Progress-first profile</Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>
          Investors can review active projects, funding history, expenses, and Fund Points before backing a request.
        </Text>
        <PrimaryButton label="Sign out" variant="secondary" onPress={handleSignOut} />
      </Card>
    </Screen>
  );
}
