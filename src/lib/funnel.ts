import AsyncStorage from '@react-native-async-storage/async-storage';

// Local-only monetization funnel counters. No network, no analytics SDK —
// values live in AsyncStorage on this device and are surfaced in the
// developer-only card in Settings. Purpose: measure the $9.99 / 5-free-logs
// experiment (paywall views → upgrade taps → purchases) on test devices.

const KEY_FUNNEL = '@mpp/funnel_stats';

export type FunnelStats = {
  paywallViews: number;
  upgradeTaps: number;
  purchases: number;
  firstSeenAt: string | null;
};

const EMPTY: FunnelStats = {
  paywallViews: 0,
  upgradeTaps: 0,
  purchases: 0,
  firstSeenAt: null,
};

export async function getFunnelStats(): Promise<FunnelStats> {
  try {
    const raw = await AsyncStorage.getItem(KEY_FUNNEL);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

async function bump(field: 'paywallViews' | 'upgradeTaps' | 'purchases'): Promise<void> {
  try {
    const stats = await getFunnelStats();
    stats[field] += 1;
    if (!stats.firstSeenAt) stats.firstSeenAt = new Date().toISOString();
    await AsyncStorage.setItem(KEY_FUNNEL, JSON.stringify(stats));
  } catch {
    // Instrumentation must never break app flows.
  }
}

export const trackPaywallView = () => bump('paywallViews');
export const trackUpgradeTap = () => bump('upgradeTaps');
export const trackPurchase = () => bump('purchases');

export async function resetFunnelStats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_FUNNEL);
  } catch {
    // Ignore; a failed reset just means stale counters.
  }
}
