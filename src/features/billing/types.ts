export type BillingMode = 'mock' | 'stripe';

export type EntitlementStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'incomplete';

export type BillingAccess = {
  has_access: boolean;
  status: EntitlementStatus;
  trial_ends_at: string | null;
  access_until: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  has_customer: boolean;
  server_now: string;
};

export type BillingFlow = 'idle' | 'checkout' | 'portal' | 'syncing';
