jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import {
  bump, EMPTY_METRICS, getLocalMetrics, recordAppOpen, recordEntryLogged, recordPaywallShown, withAppOpen,
} from '../localMetrics';

test('a day is counted once however often the app opens', () => {
  const one = withAppOpen(EMPTY_METRICS, '2026-11-01');
  expect(withAppOpen(one, '2026-11-01')).toBe(one);
  expect(withAppOpen(one, '2026-11-02').daysOpened).toBe(2);
});

test('bump counts per key', () => {
  expect(bump(bump({}, 'settings'), 'settings')).toEqual({ settings: 2 });
});

test('quick writes do not overwrite each other', async () => {
  await Promise.all([recordAppOpen(), recordAppOpen(), recordEntryLogged(), recordEntryLogged(), recordPaywallShown('labsTab')]);
  const metrics = await getLocalMetrics();
  expect(metrics.daysOpened).toBe(1);
  expect(metrics.entriesLogged).toBe(2);
  expect(metrics.paywallShown).toEqual({ labsTab: 1 });
});
