import { Redirect, Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function AppLayout() {
  const { authUser, initializing, profile } = useAuth();
  const isEntrepreneur = profile?.role === 'entrepreneur';

  if (!initializing && !authUser) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarStyle: {
          height: 76,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.black,
          paddingTop: 8,
          paddingBottom: 12,
        },
      }}
    >
      <Tabs.Screen
        name="investor-feed"
        options={{
          title: 'Discover Startups',
          href: isEntrepreneur ? null : undefined,
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="A" />,
        }}
      />
      <Tabs.Screen
        name="deck/index"
        options={{
          title: 'Deck',
          href: isEntrepreneur ? null : undefined,
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="K" />,
        }}
      />
      <Tabs.Screen
        name="deals/index"
        options={{
          title: isEntrepreneur ? 'Investor Matches' : 'Deals',
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="Q" />,
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="J" />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="U" />,
        }}
      />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen
        name="projects/index"
        options={{
          title: 'Funding Progress',
          href: isEntrepreneur ? undefined : null,
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="F" />,
        }}
      />
      <Tabs.Screen
        name="projects/create"
        options={{
          title: 'My Startup',
          href: isEntrepreneur ? undefined : null,
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="M" />,
        }}
      />
      <Tabs.Screen name="projects/[id]" options={{ href: null }} />
      <Tabs.Screen name="funding/request" options={{ href: null }} />
      <Tabs.Screen name="expenses/index" options={{ href: null }} />
      <Tabs.Screen name="wallet/index" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/delete-account" options={{ href: null }} />
      <Tabs.Screen name="profile/blocked-users" options={{ href: null }} />
      <Tabs.Screen name="profile/report-user" options={{ href: null }} />
      <Tabs.Screen name="profile/terms" options={{ href: null }} />
      <Tabs.Screen name="profile/privacy" options={{ href: null }} />
      <Tabs.Screen name="profile/download-data" options={{ href: null }} />
      <Tabs.Screen name="profile/contact-support" options={{ href: null }} />
      <Tabs.Screen name="profile/help-center" options={{ href: null }} />
    </Tabs>
  );
}

function TabGlyph({ color, label }: { color: ColorValue; label: string }) {
  return (
    <Text
      style={{
        color,
        fontSize: 13,
        fontWeight: '900',
      }}
    >
      {label}
    </Text>
  );
}
