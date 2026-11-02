import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import Stripe from 'npm:stripe@18.5.0';

import {
  getCustomerId,
  getStripe,
  getSubscriptionStatus,
  getUnixTimestamp,
  jsonResponse,
} from '../_shared/stripe.ts';

function getSubscriptionId(
  value: string | Stripe.Subscription | null | undefined,
): string | null {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function getUserId(subscription: Stripe.Subscription): string | null {
  const id = subscription.metadata.supabase_user_id;
  return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!signature) {
    return jsonResponse({ error: 'Signature Stripe manquante.' }, 400);
  }
  if (!webhookSecret) {
    console.error('Stripe webhook secret is not configured.');
    return jsonResponse({ error: 'Webhook Stripe non configuré.' }, 500);
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    console.error('Stripe webhook configuration is invalid.', error);
    return jsonResponse({ error: 'Configuration Stripe invalide.' }, 500);
  }

  let event: Stripe.Event;
  try {
    const payload = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.error('Rejected Stripe webhook signature.', error);
    return jsonResponse({ error: 'Signature Stripe invalide.' }, 400);
  }

  try {
    let subscriptionId: string | null = null;
    if (event.type === 'checkout.session.completed') {
      const checkout = event.data.object as Stripe.Checkout.Session;
      subscriptionId = getSubscriptionId(
        checkout.subscription as string | Stripe.Subscription | null,
      );
    } else if (event.type.startsWith('customer.subscription.')) {
      subscriptionId = (event.data.object as Stripe.Subscription).id;
    } else if (
      event.type === 'invoice.paid' ||
      event.type === 'invoice.payment_failed'
    ) {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
        parent?: {
          subscription_details?: {
            subscription?: string | Stripe.Subscription | null;
          } | null;
        } | null;
      };
      subscriptionId = getSubscriptionId(
        invoice.subscription ??
          invoice.parent?.subscription_details?.subscription,
      );
    } else {
      return jsonResponse({ received: true, ignored: true });
    }

    if (!subscriptionId) {
      throw new Error(`L’événement ${event.type} ne contient aucun abonnement.`);
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = getCustomerId(subscription.customer);
    if (!customerId) throw new Error('L’abonnement Stripe ne contient aucun client.');

    const currentPeriodEnd =
      subscription.items.data[0]?.current_period_end ?? subscription.ended_at;
    const projectUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!projectUrl || !serviceRoleKey) {
      throw new Error('Les secrets Supabase nécessaires ne sont pas configurés.');
    }

    const admin = createClient(projectUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.rpc('apply_stripe_subscription_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_user_id: getUserId(subscription),
      p_customer_id: customerId,
      p_subscription_id: subscription.id,
      p_status: getSubscriptionStatus(subscription.status),
      p_trial_end: getUnixTimestamp(subscription.trial_end),
      p_current_period_end: getUnixTimestamp(currentPeriodEnd),
      p_cancel_at_period_end: subscription.cancel_at_period_end,
    });
    if (error) throw error;

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed.', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Webhook processing failed.' },
      500,
    );
  }
});
