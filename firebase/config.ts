export type FirebaseEnvironment = 'development' | 'staging' | 'production';

export type PromptFundFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export const firebaseEnvironment: FirebaseEnvironment = 'development';

export const firebaseConfig: PromptFundFirebaseConfig | null = null;

export const isFirebaseEnabled = false;

export function assertFirebaseEnabled() {
  if (!isFirebaseEnabled || firebaseConfig === null) {
    throw new Error(
      'Firebase is not connected yet. Add the Firebase SDK, provide firebaseConfig, and enable the Firebase adapter before calling live Firebase APIs.',
    );
  }
}
