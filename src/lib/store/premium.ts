import {
  LEGACY_LIFETIME_ID, PAID_APP_FREE_DATE, PREMIUM_LIFETIME_ID, SUBSCRIPTION_IDS,
} from './constants';

// Pure rules for who has Premium. No store calls here, so every case is
// unit-tested (src/lib/store/__tests__/premium.test.ts).

export type PremiumSource =
  | 'none'
  | 'legacyLifetime'   // bought the $9.99 Lifetime Pro
  | 'paidApp'          // bought the app when it was a paid download (1.0.5)
  | 'legacyInstall'    // had data before the free tier and was given Pro
  | 'lifetimePremium'  // bought the new Lifetime Premium
  | 'subscription';

/** States StoreKit reports for a subscription group; Android maps onto them. */
export type SubscriptionState =
  | 'subscribed' | 'inGracePeriod' | 'inBillingRetryPeriod' | 'expired' | 'revoked' | 'none';

export type OwnedPurchase = { productId: string; revoked?: boolean };

/** Grants saved on the device by 1.x, which 2.0 keeps honoring. */
export type StoredGrant = 'paid-app' | 'legacy-install' | 'lifetime' | null;

export type PremiumInput = {
  owned: OwnedPurchase[];
  subscriptionState: SubscriptionState;
  subscriptionExpires?: number | null;
  storedGrant: StoredGrant;
  /** True when a production AppTransaction shows the app was bought before it went free. */
  paidAppBuyer: boolean;
};

export type PremiumStatus = { source: PremiumSource; expires: number | null };

/** Grace period counts as active; billing retry, expired and revoked don't. */
export function subscriptionIsActive(state: SubscriptionState): boolean {
  return state === 'subscribed' || state === 'inGracePeriod';
}

/**
 * Founder grants come first so a paid founder never shows as a subscriber,
 * then the new lifetime purchase, then an active subscription.
 */
export function resolvePremium(input: PremiumInput): PremiumStatus {
  const owns = (id: string) => input.owned.some(p => p.productId === id && !p.revoked);
  if (owns(LEGACY_LIFETIME_ID) || input.storedGrant === 'lifetime') return { source: 'legacyLifetime', expires: null };
  if (input.paidAppBuyer || input.storedGrant === 'paid-app') return { source: 'paidApp', expires: null };
  if (input.storedGrant === 'legacy-install') return { source: 'legacyInstall', expires: null };
  if (owns(PREMIUM_LIFETIME_ID)) return { source: 'lifetimePremium', expires: null };
  if (subscriptionIsActive(input.subscriptionState)) {
    return { source: 'subscription', expires: input.subscriptionExpires ?? null };
  }
  return { source: 'none', expires: null };
}

export const isPremium = (status: PremiumStatus) => status.source !== 'none';

/** Paid founders: everyone who paid in 1.x, plus the early users 1.x gave Pro. */
export const isPaidFounderSource = (source: PremiumSource) =>
  source === 'legacyLifetime' || source === 'paidApp' || source === 'legacyInstall';

export const isSubscriptionProduct = (productId: string) =>
  (SUBSCRIPTION_IDS as readonly string[]).includes(productId);

/**
 * Paid download buyers, from the App Store's own record of the first download.
 * Production only: sandbox, TestFlight and App Review never count, so testers
 * and reviewers see the new-user experience. Never uses originalAppVersion.
 */
export function isPaidAppBuyer(
  appTransaction: { environment?: string | null; originalPurchaseDate?: number | null } | null,
  freeDate: Date | null = PAID_APP_FREE_DATE,
): boolean {
  if (!appTransaction || !freeDate) return false;
  if ((appTransaction.environment ?? '').toLowerCase() !== 'production') return false;
  const purchased = appTransaction.originalPurchaseDate;
  return typeof purchased === 'number' && purchased > 0 && purchased < freeDate.getTime();
}

/** Maps StoreKit's subscription status strings onto SubscriptionState. */
export function toSubscriptionState(raw: string | null | undefined): SubscriptionState {
  switch ((raw ?? '').replace(/[\s_-]/g, '').toLowerCase()) {
    case 'subscribed': return 'subscribed';
    case 'ingraceperiod': return 'inGracePeriod';
    case 'inbillingretryperiod': return 'inBillingRetryPeriod';
    case 'expired': return 'expired';
    case 'revoked': return 'revoked';
    default: return 'none';
  }
}

/** Several statuses (monthly and annual): the most entitling one wins. */
export function strongestState(states: SubscriptionState[]): SubscriptionState {
  const order: SubscriptionState[] = ['subscribed', 'inGracePeriod', 'inBillingRetryPeriod', 'expired', 'revoked', 'none'];
  return states.reduce<SubscriptionState>((best, s) => (order.indexOf(s) < order.indexOf(best) ? s : best), 'none');
}
