import { AppState } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import * as WebBrowser from 'expo-web-browser';

import {
  createCheckoutUrl,
  createPortalUrl,
  BILLING_MODE,
  fetchBillingAccess,
  MOCK_BILLING_ACCESS,
} from '../features/billing/service';
import type { BillingAccess, BillingFlow } from '../features/billing/types';
import { disableAppBlocking } from '../lib/screenTime';
import { useAuth } from './AuthProvider';

type BillingContextValue = {
  mode: typeof BILLING_MODE;
  access: BillingAccess | null;
  isLoading: boolean;
  flow: BillingFlow;
  error: string | null;
  screenTimeError: string | null;
  refresh: () => Promise<boolean>;
  startCheckout: () => Promise<void>;
  openPortal: () => Promise<void>;
};

type AccessEntry = {
  sessionKey: string;
  value: BillingAccess | null;
  offlineUntil: number;
};

type ErrorEntry = {
  sessionKey: string;
  message: string;
};

const BillingContext = createContext<BillingContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function BillingProvider({ children }: PropsWithChildren) {
  const { isLoading: isAuthLoading, session } = useAuth();
  const [accessEntry, setAccessEntry] = useState<AccessEntry | null>(null);
  const [errorEntry, setErrorEntry] = useState<ErrorEntry | null>(null);
  const [flow, setFlow] = useState<BillingFlow>('idle');
  const [screenTimeError, setScreenTimeError] = useState<string | null>(null);
  const accessCache = useRef<AccessEntry | null>(null);
  const sessionKey = session?.access_token ?? '';
  const access =
    BILLING_MODE === 'mock'
      ? MOCK_BILLING_ACCESS
      : accessEntry?.sessionKey === sessionKey
        ? accessEntry.value
        : null;
  const error =
    errorEntry?.sessionKey === sessionKey ? errorEntry.message : null;
  const isLoading =
    BILLING_MODE === 'stripe' &&
    session !== null &&
    accessEntry?.sessionKey !== sessionKey &&
    errorEntry?.sessionKey !== sessionKey;

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!session) {
      return false;
    }

    if (BILLING_MODE === 'mock') {
      const currentAccess = await fetchBillingAccess();
      const currentEntry = {
        sessionKey,
        value: currentAccess,
        offlineUntil: Number.POSITIVE_INFINITY,
      };
      accessCache.current = currentEntry;
      setAccessEntry(currentEntry);
      setErrorEntry(null);
      return currentAccess.has_access;
    }

    try {
      const currentAccess = await fetchBillingAccess();
      const remainingValidity =
        currentAccess.has_access && currentAccess.access_until
          ? Math.max(
              0,
              Date.parse(currentAccess.access_until) -
                Date.parse(currentAccess.server_now),
            )
          : 0;
      const currentEntry = {
        sessionKey,
        value: currentAccess,
        offlineUntil:
          performance.now() + Math.min(remainingValidity, 30 * 60 * 1000),
      };
      accessCache.current = currentEntry;
      setAccessEntry(currentEntry);
      setErrorEntry(null);
      return currentAccess.has_access;
    } catch (refreshError) {
      const cached = accessCache.current;
      const canUseCachedAccess =
        cached?.sessionKey === sessionKey &&
        cached.value?.has_access === true &&
        performance.now() < cached.offlineUntil;
      if (canUseCachedAccess) {
        setAccessEntry(cached);
      } else {
        const deniedEntry = {
          sessionKey,
          value: null,
          offlineUntil: 0,
        };
        accessCache.current = deniedEntry;
        setAccessEntry(deniedEntry);
      }
      setErrorEntry({ sessionKey, message: getErrorMessage(refreshError) });
      return canUseCachedAccess;
    }
  }, [session, sessionKey]);

  useEffect(() => {
    if (!session) return;
    const initialRefresh = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(initialRefresh);
  }, [refresh, session]);

  useEffect(() => {
    const entry = accessEntry;
    if (
      BILLING_MODE !== 'stripe' ||
      entry?.value?.has_access !== true ||
      entry.sessionKey !== sessionKey
    ) {
      return;
    }

    const timer = setTimeout(() => {
      const expiredEntry = {
        sessionKey: entry.sessionKey,
        value: null,
        offlineUntil: 0,
      };
      accessCache.current = expiredEntry;
      setAccessEntry(expiredEntry);
      setErrorEntry({
        sessionKey: entry.sessionKey,
        message: 'Vérifie ta connexion pour confirmer ton accès à Tempo.',
      });
      void refresh();
    }, Math.max(0, entry.offlineUntil - performance.now()));
    return () => clearTimeout(timer);
  }, [accessEntry, refresh, sessionKey]);

  useEffect(() => {
    if (BILLING_MODE !== 'stripe' || !session) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });

    return () => subscription.remove();
  }, [refresh, session]);

  useEffect(() => {
    if (
      BILLING_MODE !== 'stripe' ||
      isAuthLoading ||
      isLoading ||
      access?.has_access === true
    ) {
      return;
    }

    void disableAppBlocking().then(
      () => setScreenTimeError(null),
      (disableError: unknown) => setScreenTimeError(getErrorMessage(disableError)),
    );
  }, [access?.has_access, isAuthLoading, isLoading, session]);

  const startCheckout = useCallback(async () => {
    setFlow('checkout');
    setErrorEntry(null);
    try {
      const checkoutUrl = await createCheckoutUrl();
      await WebBrowser.openBrowserAsync(checkoutUrl);
      setFlow('syncing');

      for (let attempt = 0; attempt < 15; attempt += 1) {
        if (await refresh()) return;
        if (attempt < 14) await wait(2000);
      }
    } catch (checkoutError) {
      setErrorEntry({ sessionKey, message: getErrorMessage(checkoutError) });
    } finally {
      setFlow('idle');
    }
  }, [refresh, sessionKey]);

  const openPortal = useCallback(async () => {
    setFlow('portal');
    setErrorEntry(null);
    try {
      const portalUrl = await createPortalUrl();
      await WebBrowser.openBrowserAsync(portalUrl);
      await refresh();
    } catch (portalError) {
      setErrorEntry({ sessionKey, message: getErrorMessage(portalError) });
    } finally {
      setFlow('idle');
    }
  }, [refresh, sessionKey]);

  const value = useMemo<BillingContextValue>(
    () => ({
      mode: BILLING_MODE,
      access,
      isLoading,
      flow,
      error,
      screenTimeError,
      refresh,
      startCheckout,
      openPortal,
    }),
    [
      access,
      error,
      flow,
      isLoading,
      openPortal,
      refresh,
      screenTimeError,
      startCheckout,
    ],
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling(): BillingContextValue {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling doit être utilisé dans un BillingProvider.');
  }

  return context;
}
