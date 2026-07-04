import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  deleteUser,
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type Auth,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import * as FirebaseAuthModule from 'firebase/auth';

import { getFirebaseApp, isFirebaseEnabled } from './config';
import { AppError, withFriendlyErrors } from '@/services/errorHandler';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthAdapter = {
  getCurrentUser: () => Promise<AuthUser | null>;
  signIn: (credentials: AuthCredentials) => Promise<AuthUser>;
  register: (credentials: AuthCredentials & { displayName: string }) => Promise<AuthUser>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateProfile: (input: { displayName?: string; photoURL?: string }) => Promise<AuthUser>;
  reauthenticate: (credentials: AuthCredentials) => Promise<void>;
  deleteCurrentUser: () => Promise<void>;
  signOut: () => Promise<void>;
  onAuthStateChanged: (callback: (user: AuthUser | null) => void) => () => void;
};

let authInstance: Auth | null = null;

type AuthDependencies = NonNullable<Parameters<typeof initializeAuth>[1]>;
type ReactNativePersistenceFactory = (storage: typeof AsyncStorage) => AuthDependencies['persistence'];

const { getReactNativePersistence } = FirebaseAuthModule as typeof FirebaseAuthModule & {
  getReactNativePersistence: ReactNativePersistenceFactory;
};

/**
 * Single Auth instance for the app. Always use this instead of getAuth(getFirebaseApp()).
 * initializeAuth with AsyncStorage persistence must run before any bare getAuth() call.
 */
export function getFirebaseAuth(): Auth {
  if (authInstance) {
    return authInstance;
  }

  const app = getFirebaseApp();

  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // Auth may already be initialized by Fast Refresh or another Firebase boundary.
    authInstance = getAuth(app);
  }

  return authInstance;
}

/** Wait until persisted auth state has been restored (or confirmed absent). */
export async function waitForAuthReady(): Promise<void> {
  await getFirebaseAuth().authStateReady();
}

/** Returns the signed-in Firebase user after auth restoration completes. */
export async function requireCurrentFirebaseUser() {
  const auth = getFirebaseAuth();
  await auth.authStateReady();

  const user = auth.currentUser;
  if (!user) {
    throw new AppError('Please sign in again before continuing.');
  }

  return user;
}

function mapFirebaseUser(user: FirebaseAuthUser): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

export const firebaseAuth: AuthAdapter = {
  async getCurrentUser() {
    const user = getFirebaseAuth().currentUser;
    return user ? mapFirebaseUser(user) : null;
  },
  async signIn({ email, password }) {
    return withFriendlyErrors(async () => {
      const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      return mapFirebaseUser(credential.user);
    });
  },
  async register({ email, password, displayName }) {
    return withFriendlyErrors(async () => {
      const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
      await updateProfile(credential.user, { displayName });
      return mapFirebaseUser(credential.user);
    });
  },
  async sendPasswordReset(email) {
    return withFriendlyErrors(async () => {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
    });
  },
  async updateProfile(input) {
    const user = getFirebaseAuth().currentUser;

    if (!user) {
      throw new AppError('Please sign in again before continuing.');
    }

    return withFriendlyErrors(async () => {
      await updateProfile(user, input);
      return mapFirebaseUser(user);
    });
  },
  async reauthenticate({ email, password }) {
    const user = getFirebaseAuth().currentUser;

    if (!user || !user.email || user.email !== email) {
      throw new AppError('Please confirm the email for your current account.');
    }

    await withFriendlyErrors(async () => {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password));
    });
  },
  async deleteCurrentUser() {
    const user = getFirebaseAuth().currentUser;

    if (!user) {
      throw new AppError('Please sign in again before continuing.');
    }

    await withFriendlyErrors(async () => {
      await deleteUser(user);
    });
  },
  async signOut() {
    await withFriendlyErrors(async () => {
      await firebaseSignOut(getFirebaseAuth());
    });
  },
  onAuthStateChanged(callback) {
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      callback(user ? mapFirebaseUser(user) : null);
    });
  },
};

export function bootstrapFirebaseAuth() {
  getFirebaseAuth();
}

if (isFirebaseEnabled) {
  bootstrapFirebaseAuth();
}
