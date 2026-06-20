import { Text, View } from 'react-native';

import { Card, Pill, PrimaryLink, Screen, SectionTitle, StatCard, ui } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { currentUser, projects } from '@/data/mockData';

export default function UserProfileScreen() {
  return (
    <Screen
      eyebrow="User Profile"
      title={currentUser.name}
      subtitle={`${currentUser.handle} · ${currentUser.location}`}
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
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900' }}>{currentUser.avatar}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{currentUser.role}</Text>
          <Text style={{ color: colors.muted, lineHeight: 21, textAlign: 'center' }}>{currentUser.bio}</Text>
        </View>
      </Card>

      <View style={ui.row}>
        <StatCard label="Trust score" value={`${currentUser.trustScore}`} tone={colors.success} />
        <StatCard label="Projects" value={String(projects.length)} tone={colors.accent} />
      </View>

      <SectionTitle title="Stack and needs" />
      <Card>
        <View style={ui.wrap}>
          {currentUser.stack.map((item) => (
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
        <PrimaryLink href="/dashboard" label="Back to dashboard" variant="secondary" />
      </Card>
    </Screen>
  );
}
