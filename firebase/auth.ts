import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseAuthUser,
} from 'firebase/auth';

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
  signOut: () => Promise<void>;
  onAuthStateChanged: (callback: (user: AuthUser | null) => void) => () => void;
};

function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
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
  async signOut() {
    await firebaseSignOut(getFirebaseAuth());
  },
  onAuthStateChanged(callback) {
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      callback(user ? mapFirebaseUser(user) : null);
    });
  },
};
