import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';

export type FirebaseEnvironment = 'development' | 'staging' | 'production';

export type PromptFundFirebaseConfig = FirebaseOptions & {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'promptfund';

export const firebaseEnvironment: FirebaseEnvironment =
  (process.env.EXPO_PUBLIC_FIREBASE_ENV as FirebaseEnvironment | undefined) ?? 'development';

export const firebaseConfig: PromptFundFirebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${projectId}.appspot.com`,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const requiredConfigKeys: Array<keyof PromptFundFirebaseConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

export const missingFirebaseConfigKeys = requiredConfigKeys.filter((key) => !firebaseConfig[key]);

export const isFirebaseEnabled = missingFirebaseConfigKeys.length === 0;

export function assertFirebaseEnabled() {
  if (!isFirebaseEnabled) {
    throw new Error(
      `Firebase config is incomplete. Missing: ${missingFirebaseConfigKeys.join(
        ', ',
      )}. Add EXPO_PUBLIC_FIREBASE_* values before calling Firebase.`,
    );
  }
}

export function getFirebaseApp(): FirebaseApp {
  assertFirebaseEnabled();
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}
