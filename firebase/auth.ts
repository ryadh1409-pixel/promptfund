import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  deleteUser,
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type Auth,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import * as FirebaseAuthModule from 'firebase/auth';

import { getFirebaseApp } from './config';

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

function getFirebaseAuth() {
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
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return mapFirebaseUser(credential.user);
  },
  async register({ email, password, displayName }) {
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await updateProfile(credential.user, { displayName });
    return mapFirebaseUser(credential.user);
  },
  async updateProfile(input) {
    const user = getFirebaseAuth().currentUser;

    if (!user) {
      throw new Error('No authenticated user is available.');
    }

    await updateProfile(user, input);
    return mapFirebaseUser(user);
  },
  async reauthenticate({ email, password }) {
    const user = getFirebaseAuth().currentUser;

    if (!user || !user.email || user.email !== email) {
      throw new Error('Re-authentication requires the current account email.');
    }

    await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password));
  },
  async deleteCurrentUser() {
    const user = getFirebaseAuth().currentUser;

    if (!user) {
      throw new Error('No authenticated user is available.');
    }

    await deleteUser(user);
  },
  async signOut() {
    await firebaseSignOut(getFirebaseAuth());
  },
  onAuthStateChanged(callback) {
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      callback(user ? mapFirebaseUser(user) : null);
    });
  },
};
