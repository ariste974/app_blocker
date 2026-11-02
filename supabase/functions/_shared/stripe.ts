import { createClient, type User } from 'npm:@supabase/supabase-js@2.49.1';
import Stripe from 'npm:stripe@18.5.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export type BillingContext = {
  admin: ReturnType<typeof createClient>;
  stripe: Stripe;
  user: User;
};

export function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function getStripe(): Stripe {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secretKey?.startsWith('sk_test_')) {
    throw new Error('Stripe est limité au mode test. Configure une clé sk_test_ dans Supabase.');
  }

  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export async function getBillingContext(req: Request): Promise<BillingContext> {
  const authorization = req.headers.get('Authorization');
  const projectUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicApiKey = req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!projectUrl || !serviceRoleKey || !publicApiKey) {
    throw new Error('Les secrets Supabase nécessaires ne sont pas configurés.');
  }
  if (!token) {
    throw new Error('Connecte-toi pour continuer.');
  }

  const userClient = createClient(projectUrl, publicApiKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    throw new Error('La session a expiré. Reconnecte-toi.');
  }

  return {
    admin: createClient(projectUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    stripe: getStripe(),
    user: userData.user,
  };
}

export function getReturnUrl(): URL {
  const returnUrl = Deno.env.get('STRIPE_RETURN_URL');
  if (!returnUrl) {
    throw new Error('Configure STRIPE_RETURN_URL avec une page HTTPS de retour.');
  }

  const url = new URL(returnUrl);
  if (url.protocol !== 'https:') {
    throw new Error('STRIPE_RETURN_URL doit utiliser HTTPS.');
  }
  return url;
}

export function getSubscriptionStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
      return 'incomplete';
    default:
      return 'expired';
  }
}

export function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  return typeof customer === 'string' ? customer : customer?.id ?? null;
}

export function getUnixTimestamp(value: number | null | undefined): string | null {
  return value ? new Date(value * 1000).toISOString() : null;
}
