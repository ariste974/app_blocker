import {
  corsHeaders,
  getBillingContext,
  getReturnUrl,
  jsonResponse,
} from '../_shared/stripe.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const { admin, stripe, user } = await getBillingContext(req);
    const { data: entitlement, error } = await admin
      .from('billing_entitlements')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!entitlement?.stripe_customer_id) {
      return jsonResponse({
        error: 'Aucun abonnement Stripe à gérer pour ce compte.',
      }, 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: entitlement.stripe_customer_id,
      return_url: getReturnUrl().toString(),
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('Unable to create Stripe customer portal session.', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Impossible d’ouvrir le portail Stripe.',
      },
      400,
    );
  }
});
