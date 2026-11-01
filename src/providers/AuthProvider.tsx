import { AppState, Platform } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Session } from '@supabase/supabase-js';

import { getAuthErrorMessage } from '../features/auth/validation';
import { supabase, supabaseConfigurationError } from '../lib/supabase';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  configurationError: string | null;
  initializationError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getConfiguredClient() {
  if (!supabase) {
    throw new Error(
      supabaseConfigurationError ?? 'La configuration Supabase est indisponible.',
    );
  }

  return supabase;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(supabase !== null);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const authClient = supabase;
    if (!authClient) return;

    let mounted = true;
    let receivedAuthEvent = false;
    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true;
      if (!mounted) return;

      setSession(nextSession);
      setInitializationError(null);
      setIsLoading(false);
    });

    void authClient.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted || receivedAuthEvent) return;

        if (error) {
          setInitializationError(getAuthErrorMessage(error));
        } else {
          setSession(data.session);
        }
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (!mounted || receivedAuthEvent) return;

        setInitializationError(getAuthErrorMessage(error));
        setIsLoading(false);
      });

    const appStateSubscription =
      Platform.OS === 'web'
        ? null
        : AppState.addEventListener('change', (state) => {
            if (state === 'active') {
              void authClient.auth.startAutoRefresh();
            } else {
              void authClient.auth.stopAutoRefresh();
            }
          });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      appStateSubscription?.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getConfiguredClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await getConfiguredClient().auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    return data.session === null;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await getConfiguredClient().auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isConfigured: supabase !== null,
      configurationError: supabaseConfigurationError,
      initializationError,
      signIn,
      signUp,
      signOut,
    }),
    [initializationError, isLoading, session, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider.');
  }

  return context;
}
