import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

import { firestoreAdapter } from '@/firebase/firestore';
import type { AppNotification, PushToken } from '@/types/User';

type NotificationsModule = typeof import('expo-notifications');

function now() {
  return new Date().toISOString();
}

async function loadNotifications(): Promise<NotificationsModule | null> {
  const nativeModules = NativeModules as Record<string, unknown>;
  if (!nativeModules.ExpoPushTokenManager && !nativeModules.ExponentPushTokenManager) {
    console.info('[PromptFund Notifications] push native module unavailable');
    return null;
  }

  try {
    return await import('expo-notifications');
  } catch (error) {
    console.info('[PromptFund Notifications] expo-notifications unavailable', error);
    return null;
  }
}

export const notificationService = {
  async registerPushToken(userId: string) {
    const Notifications = await loadNotifications();
    if (!Notifications) {
      return null;
    }

    try {
      const permission = await Notifications.getPermissionsAsync();
      const finalPermission = permission.granted ? permission : await Notifications.requestPermissionsAsync();

      if (!finalPermission.granted) {
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

      return firestoreAdapter.setWithId<Omit<PushToken, 'id'>>('pushTokens', userId, {
        userId,
        token: token.data,
        platform: Platform.OS,
        updatedAt: now(),
      });
    } catch (error) {
      console.info('[PromptFund Notifications] push notifications disabled', error);
      return null;
    }
  },

  async createNotification(input: Omit<AppNotification, 'id' | 'createdAt'>) {
    return firestoreAdapter.create<Omit<AppNotification, 'id'>>('notifications', {
      ...input,
      createdAt: now(),
    });
  },

  async listNotifications(userId: string) {
    return firestoreAdapter.queryByField<AppNotification>('notifications', 'userId', userId);
  },

  async markNotificationRead(notificationId: string) {
    return firestoreAdapter.update<AppNotification>('notifications', notificationId, {
      readAt: now(),
    });
  },
};
