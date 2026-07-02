import type { ConfigContext, ExpoConfig } from 'expo/config';

import type { FirebaseExtraConfig } from './types/FirebaseExtra';

function firebaseExtraFromEnv(): FirebaseExtraConfig {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() || 'promptfund';
  const firebase: FirebaseExtraConfig = {
    env: (process.env.EXPO_PUBLIC_FIREBASE_ENV as FirebaseExtraConfig['env'] | undefined) ?? 'development',
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || `${projectId}.appspot.com`,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() ?? '',
  };

  const missing = (['apiKey', 'messagingSenderId', 'appId'] as const).filter((key) => !firebase[key]);
  if (missing.length > 0) {
    console.warn(
      `[PromptFund app.config] Firebase env incomplete at build time. Missing: ${missing.join(', ')}. ` +
      'EAS production builds require EXPO_PUBLIC_FIREBASE_* secrets.',
    );
  }

  return firebase;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'PromptFund',
  slug: config.slug ?? 'PromptFund',
  extra: {
    ...config.extra,
    firebase: firebaseExtraFromEnv(),
  },
});
