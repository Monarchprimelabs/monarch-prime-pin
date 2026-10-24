import { labsAccess } from '../labs/labs';
import { allows } from '../featureGate';

// Handoff case 17: lapsed Premium keeps lab results viewable and exportable.
test('lab results stay readable after Premium ends', () => {
  expect(labsAccess(true, 0)).toBe('full');
  expect(labsAccess(false, 3)).toBe('readOnly');
  expect(labsAccess(false, 0)).toBe('paywall');
});

test('Premium-only views lock again for a lapsed user, photos and history stay free', () => {
  const lapsed = { premium: false, founder: 'none' as const };
  expect(allows('labResults', lapsed)).toBe(false);
  expect(allows('monthlyPDF', lapsed)).toBe(false);
  expect(allows('labResults', { premium: true, founder: 'none' })).toBe(true);
});
