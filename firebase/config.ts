import Constants from 'expo-constants';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';

import type { FirebaseExtraConfig } from '@/types/FirebaseExtra';

export type FirebaseEnvironment = 'development' | 'staging' | 'production';

export type PromptFundFirebaseConfig = FirebaseOptions & {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function readFirebaseExtra(): FirebaseExtraConfig | undefined {
  const fromExpoConfig = Constants.expoConfig?.extra?.firebase;
  if (fromExpoConfig && typeof fromExpoConfig === 'object') {
    return fromExpoConfig as FirebaseExtraConfig;
  }

  const fromManifest2 = (Constants.manifest2?.extra as { firebase?: FirebaseExtraConfig } | undefined)?.firebase;
  if (fromManifest2 && typeof fromManifest2 === 'object') {
    return fromManifest2;
  }

  const fromManifest = (Constants.manifest as { extra?: { firebase?: FirebaseExtraConfig } } | null)?.extra?.firebase;
  if (fromManifest && typeof fromManifest === 'object') {
    return fromManifest;
  }

  return undefined;
}

function resolveFirebaseConfig(): PromptFundFirebaseConfig {
  const fromExtra = readFirebaseExtra();
  const projectId = fromExtra?.projectId?.trim() || 'promptfund';

  return {
    apiKey: fromExtra?.apiKey?.trim() ?? '',
    authDomain: fromExtra?.authDomain?.trim() || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: fromExtra?.storageBucket?.trim() || `${projectId}.appspot.com`,
    messagingSenderId: fromExtra?.messagingSenderId?.trim() ?? '',
    appId: fromExtra?.appId?.trim() ?? '',
  };
}

function resolveFirebaseEnvironment(): FirebaseEnvironment {
  return readFirebaseExtra()?.env ?? 'development';
}

export const firebaseConfig: PromptFundFirebaseConfig = resolveFirebaseConfig();

export const firebaseEnvironment: FirebaseEnvironment = resolveFirebaseEnvironment();

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

function getFirebaseDiagnostics() {
  const extra = readFirebaseExtra();

  return {
    missingKeys: missingFirebaseConfigKeys,
    hasExpoConfig: Boolean(Constants.expoConfig),
    hasExpoExtra: Boolean(Constants.expoConfig?.extra),
    hasFirebaseExtra: Boolean(extra),
    expoExtraKeys: Constants.expoConfig?.extra ? Object.keys(Constants.expoConfig.extra) : [],
    firebaseExtraKeys: extra ? Object.keys(extra) : [],
    executionEnvironment: Constants.executionEnvironment,
    appOwnership: Constants.appOwnership,
  };
}

export function getFirebaseConfigErrorMessage() {
  if (isFirebaseEnabled) {
    return null;
  }

  return `Firebase is not configured for this build. Missing: ${missingFirebaseConfigKeys.join(', ')}. Set EXPO_PUBLIC_FIREBASE_* in EAS secrets (or local .env), then create a new EAS production build.`;
}

export function logFirebaseConfigDiagnostics(context = 'startup') {
  const diagnostics = getFirebaseDiagnostics();
  console.info(`[PromptFund Firebase] config diagnostics (${context})`, diagnostics);

  if (!isFirebaseEnabled) {
    console.error('[PromptFund Firebase] missing configuration values', diagnostics);
  }
}

export function assertFirebaseEnabled() {
  if (!isFirebaseEnabled) {
    logFirebaseConfigDiagnostics('assertFirebaseEnabled');
    throw new Error(getFirebaseConfigErrorMessage() ?? 'Firebase config is incomplete.');
  }
}

export function getFirebaseApp(): FirebaseApp {
  assertFirebaseEnabled();
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

if (!isFirebaseEnabled) {
  logFirebaseConfigDiagnostics('module-init');
}
