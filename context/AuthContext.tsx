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
  bootstrapFirebaseAuth,
  firebaseAuth,
  type AuthCredentials,
  type AuthUser,
} from '@/firebase/auth';
import { getFirebaseConfigErrorMessage, isFirebaseEnabled, logFirebaseConfigDiagnostics } from '@/firebase/config';
import { isAdminEmail } from '@/services/adminService';
import { defaultLegalVersions } from '@/constants/legal';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { legalService } from '@/services/legalService';
import { userService } from '@/services/userService';
import type { CreateUserInput, LegalDocumentVersions, User } from '@/types/User';
import { getActiveRole } from '@/utils/roles';

type RegisterInput = AuthCredentials &
  CreateUserInput & {
    displayName: string;
    profilePhotoUri?: string;
  };

type AuthContextValue = {
  authUser: AuthUser | null;
  profile: User | null;
  initializing: boolean;
  loading: boolean;
  error: string | null;
  legalVersions: LegalDocumentVersions | null;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshLegalVersions: () => Promise<LegalDocumentVersions>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getInitials(value: string | null) {
  const source = value?.trim() || 'Ai PromptFund User';

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
  const username = emailName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || user.uid.slice(0, 8);

  return {
    name: displayName,
    handle: username,
    displayName,
    username,
    email: user.email ?? undefined,
    role: isAdminEmail(user.email) ? 'admin' : 'angel_investor',
    roles: ['investor'],
    activeRole: 'investor',
    intent: 'investor',
    hasChosenPath: false,
    legalOnboardingRequired: false,
    avatar: getInitials(displayName),
    bio: 'Ai PromptFund profile restored automatically after Firebase Auth sign-in.',
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
  const [legalVersions, setLegalVersions] = useState<LegalDocumentVersions | null>(null);

  const refreshLegalVersions = useCallback(async () => {
    const versions = await legalService.getCurrentVersions();
    setLegalVersions(versions);
    return versions;
  }, []);

  const normalizeProfileOnLoad = useCallback(async (user: AuthUser, nextProfile: User): Promise<User> => {
    if (nextProfile.hasChosenPath === false || nextProfile.hasChosenPath === true) {
      return nextProfile;
    }

    const activeRole = getActiveRole(nextProfile);
    if (!activeRole) {
      return nextProfile;
    }
    const persistedRole = nextProfile.role === 'admin' ? 'admin' : activeRole;

    const normalizedProfile = await userService.updateUser(user.uid, {
      role: persistedRole,
      roles: Array.from(new Set([...(nextProfile.roles ?? []), activeRole])),
      activeRole,
      intent: activeRole,
      hasChosenPath: true,
    });

    return normalizedProfile ?? {
      ...nextProfile,
      role: persistedRole,
      activeRole,
      intent: activeRole,
      hasChosenPath: true,
    };
  }, []);

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
    const normalizedProfile = nextProfile ? await normalizeProfileOnLoad(user, nextProfile) : null;
    setProfile(normalizedProfile);
    return normalizedProfile;
  }, [normalizeProfileOnLoad]);

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
      logFirebaseConfigDiagnostics('AuthContext');
      setError(getFirebaseConfigErrorMessage());
      setInitializing(false);
      return undefined;
    }

    bootstrapFirebaseAuth();

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
      setAuthUser(user);

      try {
        if (user) {
          await refreshLegalVersions();
        } else {
          setLegalVersions(defaultLegalVersions);
        }
        const nextProfile = await loadUserProfile(user);
        if (user && !nextProfile) {
          await createMissingProfile(user);
        }
        setError(null);
      } catch (profileError) {
        setProfile(null);
        setError(getFriendlyErrorMessage(profileError));
      } finally {
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, [createMissingProfile, loadUserProfile, refreshLegalVersions]);

  const signIn = useCallback(
    async (credentials: AuthCredentials) => {
      setLoading(true);
      setError(null);

      try {
        const user = await firebaseAuth.signIn(credentials);
        await refreshLegalVersions();
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
        const message = getFriendlyErrorMessage(signInError);
        setError(message);
        throw signInError;
      } finally {
        setLoading(false);
      }
    },
    [createMissingProfile, loadUserProfile, refreshLegalVersions],
  );

  const register = useCallback(
    async ({ email, password, displayName, profilePhotoUri, ...profileInput }: RegisterInput) => {
      setLoading(true);
      setError(null);

      try {
        const user = await firebaseAuth.register({ email, password, displayName });
        await refreshLegalVersions();
        const path = `users/${user.uid}`;
        console.info('[PromptFund Auth] register auth user created', {
          uid: user.uid,
          path,
        });
        const normalizedProfileInput: CreateUserInput = {
          ...profileInput,
          role: isAdminEmail(user.email) ? 'admin' : profileInput.role,
          roles: profileInput.roles ?? [profileInput.activeRole ?? 'investor'],
          activeRole: profileInput.activeRole ?? profileInput.roles?.[0] ?? 'investor',
          hasChosenPath: profileInput.hasChosenPath ?? false,
          legalOnboardingRequired: true,
          displayName: displayName || profileInput.name,
          username: profileInput.username ?? profileInput.handle,
        };
        let nextProfile = await userService.createUser(user.uid, normalizedProfileInput);

        if (profilePhotoUri) {
          const photoURL = await userService.uploadProfilePhoto(user.uid, profilePhotoUri);
          await firebaseAuth.updateProfile({ photoURL });
          nextProfile = {
            ...nextProfile,
            photoURL,
          };
        }
        console.info('[PromptFund Auth] register profile created', {
          uid: user.uid,
          path,
        });
        setAuthUser(user);
        setProfile(nextProfile);
      } catch (registerError) {
        const message = getFriendlyErrorMessage(registerError);
        setError(message);
        throw registerError;
      } finally {
        setLoading(false);
      }
    },
    [refreshLegalVersions],
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
      legalVersions,
      signIn,
      register,
      signOut,
      refreshProfile,
      refreshLegalVersions,
    }),
    [authUser, error, initializing, legalVersions, loading, profile, refreshLegalVersions, refreshProfile, register, signIn, signOut],
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
