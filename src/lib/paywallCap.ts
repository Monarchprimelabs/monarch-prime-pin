// When the paywall may open on its own (docs/PRIME_PIN_V2_HANDOFF.md,
// PAYWALL). Pure rules, unit-tested; the caller keeps the history.
// User-initiated placements (a locked feature, Settings, a third plan, the
// Labs tab) always open and never go through this.

export type AutoPlacement = 'onboardingEnd' | 'monthlyRecap' | 'heatmapBeyond30Days' | 'lapsed';

export const AUTO_GAP_MS = 7 * 24 * 60 * 60 * 1000;
const ONCE_EVER: ReadonlySet<AutoPlacement> = new Set(['onboardingEnd', 'heatmapBeyond30Days']);

export type AutoHistory = { lastAutoAt: number | null; shown: AutoPlacement[]; monthlyRecapMonth?: string | null };

export function canAutoShow(placement: AutoPlacement, input: {
  history: AutoHistory;
  now: number;
  premium: boolean;
  loggingInProgress: boolean;
  purchaseFailedThisSession: boolean;
  /** "2026-11" for the monthly recap, so it shows at most once a month. */
  month?: string;
}): boolean {
  if (input.premium || input.loggingInProgress || input.purchaseFailedThisSession) return false;
  if (ONCE_EVER.has(placement) && input.history.shown.includes(placement)) return false;
  if (placement === 'monthlyRecap' && input.month && input.history.monthlyRecapMonth === input.month) return false;
  if (input.history.lastAutoAt !== null && input.now - input.history.lastAutoAt < AUTO_GAP_MS) return false;
  return true;
}

export function recordAutoShow(history: AutoHistory, placement: AutoPlacement, now: number, month?: string): AutoHistory {
  return {
    lastAutoAt: now,
    shown: history.shown.includes(placement) ? history.shown : [...history.shown, placement],
    monthlyRecapMonth: placement === 'monthlyRecap' ? (month ?? null) : history.monthlyRecapMonth ?? null,
  };
}

const REVIEW_GAP_MS = 60 * 24 * 60 * 60 * 1000;

/** Review prompts: at most once per 60 days, never after a failed purchase. */
export function mayAskForReview(lastAskedAt: number | null, now: number, purchaseFailed: boolean): boolean {
  if (purchaseFailed) return false;
  return lastAskedAt === null || now - lastAskedAt >= REVIEW_GAP_MS;
}
