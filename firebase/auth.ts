import { assertFirebaseEnabled } from './config';

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
};

export const firebaseAuth: AuthAdapter = {
  async getCurrentUser() {
    return null;
  },
  async signIn() {
    assertFirebaseEnabled();
    throw new Error('Live Firebase signIn adapter is not implemented yet.');
  },
  async register() {
    assertFirebaseEnabled();
    throw new Error('Live Firebase register adapter is not implemented yet.');
  },
  async signOut() {
    assertFirebaseEnabled();
    throw new Error('Live Firebase signOut adapter is not implemented yet.');
  },
};
