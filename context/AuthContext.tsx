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

function getInitials(value: string | null) {
  const source = value?.trim() || 'PromptFund User';

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PF';
}

function buildRecoveredProfile(user: AuthUser): CreateUserInput {
  const emailName = user.email?.split('@')[0] ?? 'promptfund-user';
  const displayName = user.displayName?.trim() || emailName;
  const handle = `@${emailName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || user.uid.slice(0, 8)}`;

  return {
    name: displayName,
    handle,
    role: 'investor',
    avatar: getInitials(displayName),
    bio: 'PromptFund profile restored automatically after Firebase Auth sign-in.',
    location: '',
    stack: [],
    trustScore: 50,
  };
}

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

    console.info('[PromptFund Auth] loadUserProfile', {
      uid: user.uid,
      path: `users/${user.uid}`,
    });
    const nextProfile = await userService.getUserById(user.uid);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const createMissingProfile = useCallback(async (user: AuthUser): Promise<User> => {
    const path = `users/${user.uid}`;

    try {
      console.info('[PromptFund Auth] createMissingProfile start', {
        uid: user.uid,
        path,
      });
      const nextProfile = await userService.createUser(user.uid, buildRecoveredProfile(user));
      setProfile(nextProfile);
      console.info('[PromptFund Auth] createMissingProfile success', {
        uid: user.uid,
        path,
      });
      return nextProfile;
    } catch (profileError) {
      console.error('[PromptFund Auth] createMissingProfile failure', {
        uid: user.uid,
        path,
        error: profileError,
      });
      throw profileError;
    }
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
        const nextProfile = await loadUserProfile(user);
        if (user && !nextProfile) {
          await createMissingProfile(user);
        }
        setError(null);
      } catch (profileError) {
        setProfile(null);
        setError(profileError instanceof Error ? profileError.message : 'Unable to load user profile.');
      } finally {
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, [createMissingProfile, loadUserProfile]);

  const signIn = useCallback(
    async (credentials: AuthCredentials) => {
      setLoading(true);
      setError(null);

      try {
        const user = await firebaseAuth.signIn(credentials);
        console.info('[PromptFund Auth] signIn success', {
          uid: user.uid,
          path: `users/${user.uid}`,
        });
        setAuthUser(user);
        let nextProfile = await loadUserProfile(user);

        if (!nextProfile) {
          nextProfile = await createMissingProfile(user);
        }
      } catch (signInError) {
        const message = signInError instanceof Error ? signInError.message : 'Unable to sign in.';
        setError(message);
        throw signInError;
      } finally {
        setLoading(false);
      }
    },
    [createMissingProfile, loadUserProfile],
  );

  const register = useCallback(
    async ({ email, password, displayName, ...profileInput }: RegisterInput) => {
      setLoading(true);
      setError(null);

      try {
        const user = await firebaseAuth.register({ email, password, displayName });
        const path = `users/${user.uid}`;
        console.info('[PromptFund Auth] register auth user created', {
          uid: user.uid,
          path,
        });
        const nextProfile = await userService.createUser(user.uid, profileInput);
        console.info('[PromptFund Auth] register profile created', {
          uid: user.uid,
          path,
        });
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
