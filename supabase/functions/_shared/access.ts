export type AccessRow = {
  status: string;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export function getAccessSnapshot(
  entitlement: AccessRow | null,
  now: number,
) {
  if (!entitlement) {
    return {
      has_access: false,
      status: 'expired',
      trial_ends_at: null,
      access_until: null,
      current_period_end: null,
      cancel_at_period_end: false,
      has_customer: false,
      server_now: new Date(now).toISOString(),
    };
  }

  const trialEndsAt = entitlement.trial_ends_at;
  const periodEndsAt = entitlement.current_period_end;
  const trialIsValid =
    entitlement.status === 'trialing' &&
    trialEndsAt !== null &&
    Date.parse(trialEndsAt) > now;
  const subscriptionIsValid =
    ['active', 'past_due', 'canceled'].includes(entitlement.status) &&
    periodEndsAt !== null &&
    Date.parse(periodEndsAt) > now;
  const hasAccess = trialIsValid || subscriptionIsValid;

  return {
    has_access: hasAccess,
    status: hasAccess ? entitlement.status : 'expired',
    trial_ends_at: trialEndsAt,
    access_until: trialIsValid ? trialEndsAt : subscriptionIsValid ? periodEndsAt : null,
    current_period_end: periodEndsAt,
    cancel_at_period_end: entitlement.cancel_at_period_end,
    has_customer: Boolean(entitlement.stripe_customer_id),
    server_now: new Date(now).toISOString(),
  };
}
