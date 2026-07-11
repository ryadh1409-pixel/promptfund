import { Redirect, Tabs, useSegments } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useEffect } from 'react';

import { AnnouncementGate } from '@/components/announcements/AnnouncementGate';
import { useAppSafeAreaInsets } from '@/components/layout/AppScreen';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { notificationService } from '@/services/notificationService';
import { appRouteForProfile, shouldShowChoosePath, shouldShowLegalOnboarding } from '@/utils/onboarding';

export default function AppLayout() {
  const { authUser, initializing, legalVersions, profile } = useAuth();
  const segments = useSegments();
  const currentRoute = String(segments[segments.length - 1] ?? '');
  const unreadNotifications = useUnreadNotifications(authUser?.uid);
  const insets = useAppSafeAreaInsets();
  const tabBarHeight = 64 + insets.bottom;

  useEffect(() => {
    if (!authUser?.uid) {
      return;
    }

    notificationService.registerPushToken(authUser.uid).catch((error) => {
      console.info('[PromptFund Notifications] push registration skipped', error);
    });
  }, [authUser?.uid]);

  if (!initializing && !authUser) {
    return <Redirect href="/login" />;
  }

  if (!initializing && authUser && profile && shouldShowLegalOnboarding(profile, legalVersions) && currentRoute !== 'legal-onboarding') {
    return <Redirect href="/legal-onboarding" />;
  }

  if (!initializing && authUser && profile && shouldShowChoosePath(profile) && currentRoute !== 'choose-path' && !shouldShowLegalOnboarding(profile, legalVersions)) {
    return <Redirect href="/choose-path" />;
  }

  if (!initializing && authUser && profile && profile.hasChosenPath === true && currentRoute === 'dashboard') {
    return <Redirect href={appRouteForProfile(profile)} />;
  }

  return (
    <>
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
          height: tabBarHeight,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.black,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      }}
    >
      <Tabs.Screen
        name="investor-feed"
        options={{
          title: 'Fundraising',
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="A" />,
        }}
      />
      <Tabs.Screen
        name="deck/index"
        options={{
          title: 'My Cards',
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="K" />,
        }}
      />
      <Tabs.Screen name="deck/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="traction/index"
        options={{
          title: 'Traction',
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="T" />,
        }}
      />
      <Tabs.Screen name="traction/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="U" />,
        }}
      />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="deals/index" options={{ href: null }} />
      <Tabs.Screen name="discussion-room/[id]" options={{ href: null }} />
      <Tabs.Screen name="agreement/[id]" options={{ href: null }} />
      <Tabs.Screen name="payment/[id]" options={{ href: null }} />
      <Tabs.Screen name="archive/index" options={{ href: null }} />
      <Tabs.Screen name="messages/index" options={{ href: null }} />
      <Tabs.Screen name="projects/index" options={{ href: null }} />
      <Tabs.Screen name="projects/create" options={{ href: null }} />
      <Tabs.Screen name="projects/[id]" options={{ href: null }} />
      <Tabs.Screen name="choose-path" options={{ href: null }} />
      <Tabs.Screen name="legal-onboarding" options={{ href: null }} />
      <Tabs.Screen name="funding/request" options={{ href: null }} />
      <Tabs.Screen name="expenses/index" options={{ href: null }} />
      <Tabs.Screen name="wallet/index" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
      <Tabs.Screen name="profile/delete-account" options={{ href: null }} />
      <Tabs.Screen name="profile/blocked-users" options={{ href: null }} />
      <Tabs.Screen name="profile/report-user" options={{ href: null }} />
      <Tabs.Screen name="profile/terms" options={{ href: null }} />
      <Tabs.Screen name="profile/privacy" options={{ href: null }} />
      <Tabs.Screen name="profile/community-guidelines" options={{ href: null }} />
      <Tabs.Screen name="profile/investment-disclaimer" options={{ href: null }} />
      <Tabs.Screen name="profile/ai-disclosure" options={{ href: null }} />
      <Tabs.Screen name="profile/download-data" options={{ href: null }} />
      <Tabs.Screen name="profile/contact-support" options={{ href: null }} />
      <Tabs.Screen name="profile/support-tickets" options={{ href: null }} />
      <Tabs.Screen name="profile/support-ticket/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile/help-center" options={{ href: null }} />
    </Tabs>
      <AnnouncementGate />
    </>
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
