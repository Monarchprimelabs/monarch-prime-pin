import { perMonth, planCopy } from '../paywallCopy';
import { AUTO_GAP_MS, canAutoShow, recordAutoShow } from '../paywallCap';

// Echo translator: shows which key was used and with which values.
const t = (key: string, vars?: Record<string, string | number>) =>
  vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(',')})` : key;

const annual = { displayPrice: '$39.99', price: 39.99, currency: 'USD' };

test('annual shows the store price and the per-month equivalent', () => {
  expect(perMonth(annual, 'en-US')).toBe('$3.33');
  const copy = planCopy({ plan: 'annual', price: annual, trialEligible: false, platform: 'ios', locale: 'en-US', t });
  expect(copy.priceLine).toBe('paywall.annualLineMonthly(price=$39.99,month=$3.33)');
});

test('trial wording and the timeline appear only when eligible', () => {
  const eligible = planCopy({ plan: 'annual', price: annual, trialEligible: true, platform: 'ios', locale: 'en-US', t });
  expect(eligible.button).toBe('paywall.startTrial');
  expect(eligible.terms).toContain('paywall.trialTerms(price=$39.99)');
  expect(eligible.showTrialTimeline).toBe(true);
  const notEligible = planCopy({ plan: 'annual', price: annual, trialEligible: false, platform: 'ios', locale: 'en-US', t });
  expect(notEligible.button).toBe('paywall.subscribeAnnual(price=$39.99)');
  expect(notEligible.terms).not.toContain('trial');
  expect(notEligible.showTrialTimeline).toBe(false);
});

test('subscriptions always carry renewal terms and where to cancel; lifetime says one-time', () => {
  const monthly = planCopy({ plan: 'monthly', price: { displayPrice: '$4.99' }, trialEligible: true, platform: 'android', locale: 'en-US', t });
  expect(monthly.terms).toContain('paywall.renewTerms');
  expect(monthly.terms).toContain('paywall.cancelAndroid');
  expect(monthly.button).toBe('paywall.subscribeMonthly(price=$4.99)');
  const lifetime = planCopy({ plan: 'lifetime', price: { displayPrice: '$79.99' }, trialEligible: true, platform: 'ios', locale: 'en-US', t });
  expect(lifetime.terms).toBe('paywall.lifetimeTerms');
});

test('no per-month figure without a numeric price', () => {
  expect(perMonth({ displayPrice: '$39.99' }, 'en-US')).toBeNull();
});

const now = Date.parse('2026-11-10T12:00:00Z');
const fresh = { lastAutoAt: null, shown: [] };
const ok = { now, premium: false, loggingInProgress: false, purchaseFailedThisSession: false };

test('automatic paywalls: at most once a week, never mid-log, never after a failed purchase, never for Premium', () => {
  expect(canAutoShow('onboardingEnd', { ...ok, history: fresh })).toBe(true);
  const after = recordAutoShow(fresh, 'onboardingEnd', now);
  expect(canAutoShow('onboardingEnd', { ...ok, history: after, now: now + 30 * AUTO_GAP_MS })).toBe(false); // once ever
  expect(canAutoShow('lapsed', { ...ok, history: after, now: now + 1000 })).toBe(false);                  // 7-day gap
  expect(canAutoShow('lapsed', { ...ok, history: after, now: now + AUTO_GAP_MS + 1 })).toBe(true);
  expect(canAutoShow('lapsed', { ...ok, history: fresh, loggingInProgress: true })).toBe(false);
  expect(canAutoShow('lapsed', { ...ok, history: fresh, purchaseFailedThisSession: true })).toBe(false);
  expect(canAutoShow('lapsed', { ...ok, history: fresh, premium: true })).toBe(false);
});

test('the monthly recap shows at most once per month', () => {
  const shown = recordAutoShow(fresh, 'monthlyRecap', now, '2026-11');
  const later = now + 8 * 24 * 3600 * 1000;
  expect(canAutoShow('monthlyRecap', { ...ok, now: later, history: shown, month: '2026-11' })).toBe(false);
  expect(canAutoShow('monthlyRecap', { ...ok, now: later, history: shown, month: '2026-12' })).toBe(true);
});

import { mayAskForReview } from '../paywallCap';

test('review prompts: at most once per 60 days, never after a failed purchase', () => {
  const day = 24 * 3600 * 1000;
  expect(mayAskForReview(null, now, false)).toBe(true);
  expect(mayAskForReview(now - 59 * day, now, false)).toBe(false);
  expect(mayAskForReview(now - 60 * day, now, false)).toBe(true);
  expect(mayAskForReview(null, now, true)).toBe(false);
});
