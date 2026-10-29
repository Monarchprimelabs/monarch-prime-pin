import {
  isPaidAppBuyer, isPaidFounderSource, isPremium, resolvePremium, strongestState,
  subscriptionIsActive, toSubscriptionState, PremiumInput,
} from '../premium';
import { LEGACY_LIFETIME_ID, PREMIUM_ANNUAL_ID, PREMIUM_LIFETIME_ID } from '../constants';

const base: PremiumInput = { owned: [], subscriptionState: 'none', storedGrant: null, paidAppBuyer: false };

test('a fresh user has no Premium', () => {
  expect(resolvePremium(base)).toEqual({ source: 'none', expires: null });
});

test('an active annual subscription gives Premium until it expires', () => {
  const status = resolvePremium({ ...base, owned: [{ productId: PREMIUM_ANNUAL_ID }], subscriptionState: 'subscribed', subscriptionExpires: 123 });
  expect(status).toEqual({ source: 'subscription', expires: 123 });
  expect(isPremium(status)).toBe(true);
});

test('grace period keeps Premium; billing retry, expiry and revocation end it', () => {
  expect(subscriptionIsActive('inGracePeriod')).toBe(true);
  for (const state of ['inBillingRetryPeriod', 'expired', 'revoked', 'none'] as const) {
    expect(resolvePremium({ ...base, subscriptionState: state }).source).toBe('none');
  }
});

test('the $9.99 Lifetime Pro is a paid founder and outranks a subscription', () => {
  const status = resolvePremium({ ...base, owned: [{ productId: LEGACY_LIFETIME_ID }], subscriptionState: 'subscribed' });
  expect(status.source).toBe('legacyLifetime');
  expect(isPaidFounderSource(status.source)).toBe(true);
});

test('a refunded purchase gives nothing', () => {
  expect(resolvePremium({ ...base, owned: [{ productId: LEGACY_LIFETIME_ID, revoked: true }] }).source).toBe('none');
  expect(resolvePremium({ ...base, owned: [{ productId: PREMIUM_LIFETIME_ID, revoked: true }] }).source).toBe('none');
});

test('the new Lifetime Premium is Premium but not a founder', () => {
  const status = resolvePremium({ ...base, owned: [{ productId: PREMIUM_LIFETIME_ID }] });
  expect(status.source).toBe('lifetimePremium');
  expect(isPaidFounderSource(status.source)).toBe(false);
});

test('grants 1.x saved on the device are honored', () => {
  expect(resolvePremium({ ...base, storedGrant: 'lifetime' }).source).toBe('legacyLifetime');
  expect(resolvePremium({ ...base, storedGrant: 'paid-app' }).source).toBe('paidApp');
  expect(resolvePremium({ ...base, storedGrant: 'legacy-install' }).source).toBe('legacyInstall');
  expect(isPaidFounderSource('legacyInstall')).toBe(true);
});

test('paid-download buyers come from a production AppTransaction date, never in sandbox', () => {
  const freeDate = new Date('2026-06-19T00:00:00Z');
  const before = Date.parse('2026-05-01T00:00:00Z');
  const after = Date.parse('2026-07-01T00:00:00Z');
  expect(isPaidAppBuyer({ environment: 'Production', originalPurchaseDate: before }, freeDate)).toBe(true);
  expect(isPaidAppBuyer({ environment: 'Production', originalPurchaseDate: after }, freeDate)).toBe(false);
  expect(isPaidAppBuyer({ environment: 'Sandbox', originalPurchaseDate: before }, freeDate)).toBe(false);
  expect(isPaidAppBuyer({ environment: 'Xcode', originalPurchaseDate: before }, freeDate)).toBe(false);
  expect(isPaidAppBuyer(null, freeDate)).toBe(false);
  // Until the owner sets the date, nobody is matched this way.
  expect(isPaidAppBuyer({ environment: 'Production', originalPurchaseDate: before }, null)).toBe(false);
});

test('StoreKit status strings map onto states, and the strongest one wins', () => {
  expect(toSubscriptionState('inGracePeriod')).toBe('inGracePeriod');
  expect(toSubscriptionState('IN_BILLING_RETRY_PERIOD')).toBe('inBillingRetryPeriod');
  expect(toSubscriptionState('weird')).toBe('none');
  expect(strongestState(['expired', 'subscribed'])).toBe('subscribed');
  expect(strongestState([])).toBe('none');
});
