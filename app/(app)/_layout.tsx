import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { colors } from '@/constants/theme';

export default function AppLayout() {
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
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="D" />,
        }}
      />
      <Tabs.Screen
        name="projects/index"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="P" />,
        }}
      />
      <Tabs.Screen
        name="investor-feed"
        options={{
          title: 'Investors',
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="I" />,
        }}
      />
      <Tabs.Screen
        name="wallet/index"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="W" />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="U" />,
        }}
      />
      <Tabs.Screen name="projects/create" options={{ href: null }} />
      <Tabs.Screen name="projects/[id]" options={{ href: null }} />
      <Tabs.Screen name="funding/request" options={{ href: null }} />
      <Tabs.Screen name="expenses/index" options={{ href: null }} />
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
