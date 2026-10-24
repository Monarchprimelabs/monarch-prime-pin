// Store configuration for Monarch Prime Pin 2.0 (docs/PRIME_PIN_V2_HANDOFF.md).
// Every TODO is the owner's to confirm in App Store Connect / Play Console.

/** Premium subscription group: monthly and annual share one level of service. */
export const SUBSCRIPTION_GROUP_NAME = 'Monarch Prime Pin Premium';

// TODO(owner): confirm these three IDs in App Store Connect and Play Console.
export const PREMIUM_MONTHLY_ID = 'com.monarchprime.pin.premium.monthly';
export const PREMIUM_ANNUAL_ID = 'com.monarchprime.pin.premium.annual';
export const PREMIUM_LIFETIME_ID = 'com.monarchprime.pin.premium.lifetime';
export const SUBSCRIPTION_IDS = [PREMIUM_MONTHLY_ID, PREMIUM_ANNUAL_ID] as const;

/**
 * The $9.99 Lifetime Pro non-consumable sold in 1.x. It comes off sale after
 * 2.0, but every check keeps honoring it: these buyers are paid founders.
 * TODO(owner): confirm in App Store Connect (this is the ID the 1.x code sells).
 */
export const LEGACY_LIFETIME_ID = 'com.monarchprime.pin.pro.lifetime';

/**
 * 1.0.5 (build 9) was a paid download; from 1.1.x the app is free with the IAP.
 * Anyone whose production AppTransaction.originalPurchaseDate is before the
 * day the price changed to Free paid for the app and is a paid founder.
 * TODO(owner): set from App Store Connect (Sales and Trends shows the last day
 * with paid downloads). The free-tier build was approved on 2026-06-19, so
 * this is the earliest the price can have changed; a later date is safer than
 * an earlier one, because a too-early date would miss people who paid.
 */
export const PAID_APP_FREE_DATE: Date | null = null;

/**
 * The 2.0 release date. Anyone whose production originalPurchaseDate is before
 * it is a free founder (covers people who deleted and reinstalled).
 * TODO(owner): set to the 2.0 release date before submitting.
 */
export const FOUNDER_CUTOFF: Date | null = null;

/** TODO(owner): the custom offer code created on the annual plan for founders. */
export const FOUNDER_CODE = '';

/** Apple's standard EULA. TODO(owner): replace if you publish your own terms. */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
/** TODO(owner): the privacy policy URL from App Store Connect > App Information. */
export const PRIVACY_URL = '';
