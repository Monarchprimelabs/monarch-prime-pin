// Pure founder rules (docs/PRIME_PIN_V2_HANDOFF.md, FOUNDERS). Unit-tested in
// src/lib/__tests__/founders.test.ts; storage lives in src/lib/founders.tsx.

export type FounderStatus = 'none' | 'freeFounder' | 'paidFounder';

const RANK: Record<FounderStatus, number> = { none: 0, freeFounder: 1, paidFounder: 2 };

/** A status only ever moves up: once a founder, always a founder. */
export function higherStatus(a: FounderStatus, b: FounderStatus): FounderStatus {
  return RANK[a] >= RANK[b] ? a : b;
}

/**
 * Keys 2.0 itself may write before or during the founder check. Anything
 * else under @mpp/ was written by 1.x, so its presence on the first 2.0
 * launch means the person used the app before 2.0.
 */
export const V2_KEYS = new Set([
  '@mpp/founder_evidence_v1',
  '@mpp/founder_status_v1',
  '@mpp/founder_sheet_shown_v1',
  '@mpp/subscription_cache_v1',
]);

export function has1xData(keys: readonly string[]): boolean {
  return keys.some(key => key.startsWith('@mpp/') && !V2_KEYS.has(key));
}

export type AppTransactionLike = { environment?: string | null; originalPurchaseDate?: number | null };

/**
 * Downloaded before 2.0, by the App Store's own record. Production only, so
 * sandbox, TestFlight and App Review always get the new-user experience.
 * Returns null when the answer isn't known yet (no cutoff set, or no
 * AppTransaction because the device was offline), so the check is retried.
 */
export function downloadedBefore2(appTransaction: AppTransactionLike | null, cutoff: Date | null): boolean | null {
  if (!cutoff || !appTransaction) return null;
  if ((appTransaction.environment ?? '').toLowerCase() !== 'production') return false;
  const purchased = appTransaction.originalPurchaseDate;
  if (typeof purchased !== 'number' || purchased <= 0) return null;
  return purchased < cutoff.getTime();
}

/**
 * One decision. `stored` is what was saved before (null on first 2.0
 * launch). Returns the status and whether it is final enough to save.
 */
export function decideFounder(input: {
  stored: FounderStatus | null;
  had1xData: boolean;
  paidFounderPurchase: boolean;
  downloadedBefore: boolean | null;
}): { status: FounderStatus; settled: boolean } {
  let status: FounderStatus = input.stored ?? 'none';
  if (input.paidFounderPurchase) status = higherStatus(status, 'paidFounder');
  if (input.had1xData || input.downloadedBefore === true) status = higherStatus(status, 'freeFounder');
  // "none" is only saved once the App Store date check actually answered.
  const settled = status !== 'none' || input.downloadedBefore === false;
  return { status, settled };
}
