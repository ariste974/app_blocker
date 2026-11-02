import {
  getBillingContext,
  corsHeaders,
  jsonResponse,
} from '../_shared/stripe.ts';
import { getAccessSnapshot } from '../_shared/access.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const { admin, user } = await getBillingContext(req);
    const { data: entitlement, error } = await admin
      .from('billing_entitlements')
      .select(
        'status, trial_ends_at, stripe_customer_id, current_period_end, cancel_at_period_end',
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return jsonResponse(
      getAccessSnapshot(entitlement, Date.now()),
    );
  } catch (error) {
    console.error('Unable to read billing access.', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unable to read billing access.' },
      400,
    );
  }
});
