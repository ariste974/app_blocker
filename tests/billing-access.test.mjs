import assert from 'node:assert/strict';
import test from 'node:test';

import { getAccessSnapshot } from '../supabase/functions/_shared/access.ts';

const now = Date.parse('2026-11-02T12:00:00.000Z');

function entitlement(overrides = {}) {
  return {
    status: 'trialing',
    trial_ends_at: '2026-11-09T12:00:00.000Z',
    stripe_customer_id: null,
    current_period_end: null,
    cancel_at_period_end: false,
    ...overrides,
  };
}

test('a new user has access until the server-calculated trial end', () => {
  assert.deepEqual(getAccessSnapshot(entitlement(), now), {
    has_access: true,
    status: 'trialing',
    trial_ends_at: '2026-11-09T12:00:00.000Z',
    access_until: '2026-11-09T12:00:00.000Z',
    current_period_end: null,
    cancel_at_period_end: false,
    has_customer: false,
    server_now: '2026-11-02T12:00:00.000Z',
  });
});

test('expired trials and subscriptions do not grant access', () => {
  const expiredTrial = getAccessSnapshot(
    entitlement({ trial_ends_at: '2026-11-01T12:00:00.000Z' }),
    now,
  );
  assert.equal(expiredTrial.has_access, false);
  assert.equal(expiredTrial.status, 'expired');

  const expiredSubscription = getAccessSnapshot(
    entitlement({
      status: 'active',
      current_period_end: '2026-11-01T12:00:00.000Z',
    }),
    now,
  );
  assert.equal(expiredSubscription.has_access, false);
});

test('a 30-second trial expires according to the server time', () => {
  const trialStart = Date.parse('2026-11-02T12:00:00.000Z');
  const trialEndsAt = new Date(trialStart + 30_000).toISOString();
  const shortTrial = entitlement({
    trial_ends_at: trialEndsAt,
  });

  assert.equal(getAccessSnapshot(shortTrial, trialStart + 29_999).has_access, true);
  assert.equal(getAccessSnapshot(shortTrial, trialStart + 30_000).has_access, false);
});

test('past-due and canceled subscriptions retain access only until paid period end', () => {
  for (const status of ['past_due', 'canceled']) {
    const snapshot = getAccessSnapshot(
      entitlement({
        status,
        trial_ends_at: null,
        stripe_customer_id: 'cus_test',
        current_period_end: '2026-11-10T12:00:00.000Z',
        cancel_at_period_end: true,
      }),
      now,
    );
    assert.equal(snapshot.has_access, true);
    assert.equal(snapshot.status, status);
    assert.equal(snapshot.has_customer, true);
    assert.equal(snapshot.server_now, '2026-11-02T12:00:00.000Z');
  }
});

test('incomplete and missing entitlements fail closed', () => {
  assert.equal(
    getAccessSnapshot(
      entitlement({ status: 'incomplete', current_period_end: '2026-12-01T00:00:00Z' }),
      now,
    ).has_access,
    false,
  );
  assert.equal(getAccessSnapshot(null, now).has_access, false);
});
