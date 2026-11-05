import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDateISO } from './dates';

// On-device counters only: days opened, entries logged, notification actions
// and paywall views or purchases by placement. Stored in the app's own
// storage, never sent anywhere, no identifiers. Shown to the user in the
// "Your activity" card. App Privacy stays "Data Not Collected".

const KEY = '@mpp/local_metrics_v1';

export type LocalMetrics = {
  daysOpened: number;
  lastOpenDay: string | null;
  entriesLogged: number;
  notificationActions: Record<string, number>;
  paywallShown: Record<string, number>;
  paywallPurchased: Record<string, number>;
};

export const EMPTY_METRICS: LocalMetrics = {
  daysOpened: 0, lastOpenDay: null, entriesLogged: 0, notificationActions: {}, paywallShown: {}, paywallPurchased: {},
};

/** Counts a day once, however often the app opens that day. */
export function withAppOpen(metrics: LocalMetrics, day: string): LocalMetrics {
  if (metrics.lastOpenDay === day) return metrics;
  return { ...metrics, daysOpened: metrics.daysOpened + 1, lastOpenDay: day };
}

export function bump(map: Record<string, number>, key: string): Record<string, number> {
  return { ...map, [key]: (map[key] ?? 0) + 1 };
}

export async function getLocalMetrics(): Promise<LocalMetrics> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY_METRICS, ...JSON.parse(raw) } : EMPTY_METRICS;
  } catch {
    return EMPTY_METRICS;
  }
}

// Writes are chained so two quick events don't overwrite each other.
let chain: Promise<unknown> = Promise.resolve();
function update(change: (m: LocalMetrics) => LocalMetrics): Promise<void> {
  const next = chain.then(async () => {
    const before = await getLocalMetrics();
    const after = change(before);
    if (after !== before) await AsyncStorage.setItem(KEY, JSON.stringify(after));
  }).catch(() => undefined);
  chain = next;
  return next;
}

export const recordAppOpen = () => update(m => withAppOpen(m, localDateISO()));
export const recordEntryLogged = () => update(m => ({ ...m, entriesLogged: m.entriesLogged + 1 }));
export const recordNotificationAction = (action: string) => update(m => ({ ...m, notificationActions: bump(m.notificationActions, action) }));
export const recordPaywallShown = (placement: string) => update(m => ({ ...m, paywallShown: bump(m.paywallShown, placement) }));
export const recordPaywallPurchased = (placement: string) => update(m => ({ ...m, paywallPurchased: bump(m.paywallPurchased, placement) }));

export const total = (map: Record<string, number>) => Object.values(map).reduce((sum, n) => sum + n, 0);
