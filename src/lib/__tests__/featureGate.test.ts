import { ALL_FEATURES, allows, FOUNDER_FREE_FEATURES, FREE_ACTIVE_PLANS } from '../featureGate';

test('every feature is locked for a free user and open for Premium', () => {
  for (const feature of ALL_FEATURES) {
    expect(allows(feature, { premium: false, founder: 'none' })).toBe(false);
    expect(allows(feature, { premium: true, founder: 'none' })).toBe(true);
  }
});

test('free founders keep exactly what 1.x gave them, and nothing paid', () => {
  for (const feature of ALL_FEATURES) {
    expect(allows(feature, { premium: false, founder: 'freeFounder' })).toBe(FOUNDER_FREE_FEATURES.has(feature));
  }
  expect(allows('fullHistoryHeatmap', { premium: false, founder: 'freeFounder' })).toBe(true);
  expect(allows('labResults', { premium: false, founder: 'freeFounder' })).toBe(false);
});

test('the free tier includes 2 active plans', () => {
  expect(FREE_ACTIVE_PLANS).toBe(2);
});
