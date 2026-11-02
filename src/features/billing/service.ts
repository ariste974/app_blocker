import { supabase, supabaseConfigurationError } from '../../lib/supabase';
import type { BillingAccess, BillingMode } from './types';

const configuredBillingMode = process.env.EXPO_PUBLIC_BILLING_PROVIDER;
if (
  configuredBillingMode !== undefined &&
  configuredBillingMode !== 'mock' &&
  configuredBillingMode !== 'stripe'
) {
  throw new Error('EXPO_PUBLIC_BILLING_PROVIDER doit valoir « mock » ou « stripe ».');
}

export const BILLING_MODE: BillingMode =
  configuredBillingMode === 'stripe' ? 'stripe' : 'mock';

const mockAccess: BillingAccess = {
  has_access: true,
  status: 'active',
  trial_ends_at: null,
  access_until: null,
  current_period_end: null,
  cancel_at_period_end: false,
  has_customer: false,
  server_now: new Date().toISOString(),
};

export const MOCK_BILLING_ACCESS = mockAccess;

function getClient() {
  if (!supabase) {
    throw new Error(
      supabaseConfigurationError ?? 'La configuration Supabase est indisponible.',
    );
  }

  return supabase;
}

function isBillingAccess(value: unknown): value is BillingAccess {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Partial<BillingAccess>;
  const isValidTimestamp = (timestamp: string | null | undefined) =>
    timestamp === null ||
    (typeof timestamp === 'string' && Number.isFinite(Date.parse(timestamp)));

  return (
    typeof response.has_access === 'boolean' &&
    typeof response.status === 'string' &&
    [
      'trialing',
      'active',
      'past_due',
      'canceled',
      'expired',
      'incomplete',
    ].includes(response.status) &&
    typeof response.cancel_at_period_end === 'boolean' &&
    typeof response.has_customer === 'boolean' &&
    typeof response.server_now === 'string' &&
    Number.isFinite(Date.parse(response.server_now)) &&
    isValidTimestamp(response.trial_ends_at) &&
    isValidTimestamp(response.access_until) &&
    isValidTimestamp(response.current_period_end)
  );
}

async function invokeBillingFunction<T extends { url: string }>(
  functionName: string,
): Promise<T> {
  const { data, error } = await getClient().functions.invoke(functionName, {
    body: {},
  });
  if (error) {
    if ('context' in error && error.context instanceof Response) {
      const payload: unknown = await error.context.clone().json().catch(() => null);
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        typeof payload.error === 'string'
      ) {
        throw new Error(payload.error);
      }
    }
    throw error;
  }

  if (
    typeof data !== 'object' ||
    data === null ||
    typeof (data as { url?: unknown }).url !== 'string'
  ) {
    throw new Error('Le serveur de paiement a renvoyé une réponse invalide.');
  }

  const url = new URL((data as { url: string }).url);
  if (url.protocol !== 'https:') {
    throw new Error('Le serveur a renvoyé une URL de paiement non sécurisée.');
  }

  return data as T;
}

export async function fetchBillingAccess(): Promise<BillingAccess> {
  if (BILLING_MODE === 'mock') return mockAccess;

  const { data, error } = await getClient().functions.invoke('get-access-status', {
    body: {},
  });
  if (error) {
    if ('context' in error && error.context instanceof Response) {
      const payload: unknown = await error.context.clone().json().catch(() => null);
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        typeof payload.error === 'string'
      ) {
        throw new Error(payload.error);
      }
    }
    throw error;
  }
  if (!isBillingAccess(data)) {
    throw new Error('Le serveur a renvoyé un statut d’accès invalide.');
  }

  return data;
}

export async function createCheckoutUrl(): Promise<string> {
  const { url } = await invokeBillingFunction<{ url: string }>(
    'create-checkout-session',
  );
  return url;
}

export async function createPortalUrl(): Promise<string> {
  const { url } = await invokeBillingFunction<{ url: string }>(
    'create-portal-session',
  );
  return url;
}
