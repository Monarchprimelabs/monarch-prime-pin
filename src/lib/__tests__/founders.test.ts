import { decideFounder, downloadedBefore2, has1xData, higherStatus } from '../founderRules';

const cutoff = new Date('2026-11-15T00:00:00Z');
const before = Date.parse('2026-08-01T00:00:00Z');
const after = Date.parse('2026-12-01T00:00:00Z');

test('1.x data present means freeFounder; only 2.0 keys or nothing means no evidence', () => {
  expect(has1xData(['@mpp/injections'])).toBe(true);
  expect(has1xData(['@mpp/onboarding_done', '@mpp/founder_status_v1'])).toBe(true);
  expect(has1xData(['@mpp/founder_evidence_v1', '@mpp/subscription_cache_v1'])).toBe(false);
  expect(has1xData([])).toBe(false);
  expect(has1xData(['some_other_lib_key'])).toBe(false);
});

test('the AppTransaction date counts only in production', () => {
  expect(downloadedBefore2({ environment: 'Production', originalPurchaseDate: before }, cutoff)).toBe(true);
  expect(downloadedBefore2({ environment: 'Production', originalPurchaseDate: after }, cutoff)).toBe(false);
  expect(downloadedBefore2({ environment: 'Sandbox', originalPurchaseDate: before }, cutoff)).toBe(false);
  expect(downloadedBefore2({ environment: 'Xcode', originalPurchaseDate: before }, cutoff)).toBe(false);
  expect(downloadedBefore2(null, cutoff)).toBeNull();          // offline: retry later
  expect(downloadedBefore2({ environment: 'Production', originalPurchaseDate: before }, null)).toBeNull();
});

test('decisions: data, date, legacy purchase, nothing', () => {
  expect(decideFounder({ stored: null, had1xData: true, paidFounderPurchase: false, downloadedBefore: null }))
    .toEqual({ status: 'freeFounder', settled: true });
  expect(decideFounder({ stored: null, had1xData: false, paidFounderPurchase: false, downloadedBefore: true }))
    .toEqual({ status: 'freeFounder', settled: true });
  expect(decideFounder({ stored: null, had1xData: false, paidFounderPurchase: true, downloadedBefore: null }))
    .toEqual({ status: 'paidFounder', settled: true });
  expect(decideFounder({ stored: null, had1xData: false, paidFounderPurchase: false, downloadedBefore: false }))
    .toEqual({ status: 'none', settled: true });
  // Offline with no other evidence: undecided, so it is checked again next launch.
  expect(decideFounder({ stored: null, had1xData: false, paidFounderPurchase: false, downloadedBefore: null }))
    .toEqual({ status: 'none', settled: false });
});

test('a saved status persists and never drops', () => {
  expect(decideFounder({ stored: 'freeFounder', had1xData: false, paidFounderPurchase: false, downloadedBefore: false }).status)
    .toBe('freeFounder');
  expect(decideFounder({ stored: 'paidFounder', had1xData: false, paidFounderPurchase: false, downloadedBefore: false }).status)
    .toBe('paidFounder');
  // A free founder who restores the legacy purchase moves up.
  expect(decideFounder({ stored: 'freeFounder', had1xData: true, paidFounderPurchase: true, downloadedBefore: null }).status)
    .toBe('paidFounder');
  expect(higherStatus('paidFounder', 'none')).toBe('paidFounder');
});

import { FOUNDER_CUTOFF } from '../store/constants';

test('the founder cutoff is set, so 1.x users stay founders after a reinstall', () => {
  expect(FOUNDER_CUTOFF).toBeInstanceOf(Date);
  // Someone who first downloaded the app in 1.x, deleted it and installs 2.0 fresh:
  // no 1.x data on the phone, but the App Store's first-download date is before the cutoff.
  const firstDownload = new Date('2026-08-01T12:00:00Z').getTime();
  const reinstalled = downloadedBefore2({ environment: 'Production', originalPurchaseDate: firstDownload }, FOUNDER_CUTOFF);
  expect(reinstalled).toBe(true);
  expect(decideFounder({ stored: null, had1xData: false, paidFounderPurchase: false, downloadedBefore: reinstalled })).toEqual({ status: 'freeFounder', settled: true });
  // TestFlight and App Review never count.
  expect(downloadedBefore2({ environment: 'Sandbox', originalPurchaseDate: firstDownload }, FOUNDER_CUTOFF)).toBe(false);
});
