import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  firebaseAuth,
  type AuthCredentials,
  type AuthUser,
} from '@/firebase/auth';
import { isFirebaseEnabled, missingFirebaseConfigKeys } from '@/firebase/config';
import { userService } from '@/services/userService';
import type { CreateUserInput, User } from '@/types/User';

type RegisterInput = AuthCredentials &
  CreateUserInput & {
    displayName: string;
  };

type AuthContextValue = {
  authUser: AuthUser | null;
  profile: User | null;
  initializing: boolean;
  loading: boolean;
  error: string | null;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserProfile = useCallback(async (user: AuthUser | null): Promise<User | null> => {
    if (!user) {
      setProfile(null);
      return null;
    }

    const nextProfile = await userService.getUserById(user.uid);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadUserProfile(authUser);
  }, [authUser, loadUserProfile]);

  useEffect(() => {
    if (!isFirebaseEnabled) {
      setError(`Missing Firebase env vars: ${missingFirebaseConfigKeys.join(', ')}`);
      setInitializing(false);
      return undefined;
    }

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
      setAuthUser(user);

      try {
        await loadUserProfile(user);
        setError(null);
      } catch (profileError) {
        setProfile(null);
        setError(profileError instanceof Error ? profileError.message : 'Unable to load user profile.');
      } finally {
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, [loadUserProfile]);

  const signIn = useCallback(
    async (credentials: AuthCredentials) => {
      setLoading(true);
      setError(null);

      try {
        const user = await firebaseAuth.signIn(credentials);
        setAuthUser(user);
        const nextProfile = await loadUserProfile(user);

        if (!nextProfile) {
          await firebaseAuth.signOut();
          setAuthUser(null);
          throw new Error('No PromptFund profile was found for this Firebase account.');
        }
      } catch (signInError) {
        const message = signInError instanceof Error ? signInError.message : 'Unable to sign in.';
        setError(message);
        throw signInError;
      } finally {
        setLoading(false);
      }
    },
    [loadUserProfile],
  );

  const register = useCallback(
    async ({ email, password, displayName, ...profileInput }: RegisterInput) => {
      setLoading(true);
      setError(null);

      try {
        const user = await firebaseAuth.register({ email, password, displayName });
        const nextProfile = await userService.createUser(user.uid, profileInput);
        setAuthUser(user);
        setProfile(nextProfile);
      } catch (registerError) {
        const message = registerError instanceof Error ? registerError.message : 'Unable to register.';
        setError(message);
        throw registerError;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await firebaseAuth.signOut();
      setAuthUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authUser,
      profile,
      initializing,
      loading,
      error,
      signIn,
      register,
      signOut,
      refreshProfile,
    }),
    [authUser, error, initializing, loading, profile, refreshProfile, register, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
