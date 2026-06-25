import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { firestoreAdapter } from '@/firebase/firestore';
import type { AppNotification, PushToken } from '@/types/User';

function now() {
  return new Date().toISOString();
}

export const notificationService = {
  async registerPushToken(userId: string) {
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
