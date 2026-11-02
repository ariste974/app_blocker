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
    const priceId = Deno.env.get('STRIPE_PRICE_ID');
    if (!priceId?.startsWith('price_')) {
      throw new Error('Configure STRIPE_PRICE_ID avec le prix récurrent de test.');
    }

    const { data: entitlement, error: entitlementError } = await admin
      .from('billing_entitlements')
      .select('status, stripe_customer_id, stripe_subscription_id, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    if (entitlementError) throw entitlementError;
    if (!entitlement) {
      return jsonResponse({ error: 'Aucun droit d’accès n’est associé à ce compte.' }, 404);
    }

    const paidPeriodEndsAt = entitlement.current_period_end
      ? Date.parse(entitlement.current_period_end)
      : 0;
    if (
      entitlement.stripe_subscription_id &&
      paidPeriodEndsAt > Date.now() &&
      ['trialing', 'active', 'past_due', 'canceled'].includes(entitlement.status)
    ) {
      return jsonResponse({
        error: 'Un abonnement existe déjà. Utilise le portail pour le gérer.',
      }, 409);
    }

    const price = await stripe.prices.retrieve(priceId);
    if (
      !price.active ||
      price.currency !== 'eur' ||
      price.unit_amount !== 300 ||
      price.recurring?.interval !== 'month'
    ) {
      throw new Error('Le prix Stripe doit être actif, récurrent, mensuel et fixé à 3 €.');
    }

    let customerId = entitlement.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email,
          metadata: { supabase_user_id: user.id },
        },
        { idempotencyKey: `tempo-customer-${user.id}` },
      );
      customerId = customer.id;

      const { error: updateError } = await admin
        .from('billing_entitlements')
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (updateError) throw updateError;
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });
    const existingSubscription = subscriptions.data.some((subscription) => {
      if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
        return true;
      }

      const periodEnd =
        subscription.items.data[0]?.current_period_end ?? subscription.ended_at ?? 0;
      return subscription.status === 'canceled' && periodEnd * 1000 > Date.now();
    });
    if (existingSubscription) {
      return jsonResponse({
        error: 'Un abonnement existe déjà. Utilise le portail pour le gérer.',
      }, 409);
    }

    const returnUrl = getReturnUrl();
    const successUrl = new URL(returnUrl);
    successUrl.searchParams.set('status', 'success');
    const cancelUrl = new URL(returnUrl);
    cancelUrl.searchParams.set('status', 'cancel');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    if (!session.url) {
      throw new Error('Stripe n’a pas fourni de lien de paiement.');
    }

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('Unable to create Stripe Checkout session.', error);
    const message = error instanceof Error ? error.message : 'Impossible de créer le paiement.';
    const status = message.includes('existe déjà') ? 409 : 400;
    return jsonResponse({ error: message }, status);
  }
});
