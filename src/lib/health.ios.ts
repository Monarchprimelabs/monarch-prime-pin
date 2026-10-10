import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isHealthDataAvailable,
  queryQuantitySamples,
  queryStatisticsCollectionForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { localDateISO } from './dates';

// Apple Health, read-only: body weight (lb, matching the log screen), body
// fat percentage and daily step totals. Optional, off until the user turns it on in
// Settings. Nothing is written to Health and nothing leaves the phone.
// iOS never says whether read access was granted, so "no samples" can mean
// either no data or no permission; the UI words it that way.

const KEY_HEALTH_ENABLED = '@mpp/health_read_enabled';
const WEIGHT = 'HKQuantityTypeIdentifierBodyMass' as const;
const BODY_FAT = 'HKQuantityTypeIdentifierBodyFatPercentage' as const;
const STEPS = 'HKQuantityTypeIdentifierStepCount' as const;
const READ_TYPES = [WEIGHT, BODY_FAT, STEPS];
// Bumped when READ_TYPES grows, so people who turned Health on before steps
// existed are asked once more (iOS only shows types not asked about yet).
const KEY_HEALTH_ASKED = '@mpp/health_read_asked_v2';

export type HealthPoint = { date: string; at: string; value: number };

export function healthSupported(): boolean {
  try {
    return isHealthDataAvailable();
  } catch {
    return false;
  }
}

export async function getHealthEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_HEALTH_ENABLED)) === 'true';
  } catch {
    return false;
  }
}

/** Ask for read access (iOS shows its sheet once), then remember the choice. */
export async function enableHealth(): Promise<boolean> {
  if (!healthSupported()) return false;
  await requestAuthorization({ toRead: READ_TYPES });
  await AsyncStorage.multiSet([[KEY_HEALTH_ENABLED, 'true'], [KEY_HEALTH_ASKED, 'true']]);
  return true;
}

async function ensureAsked(): Promise<void> {
  if ((await AsyncStorage.getItem(KEY_HEALTH_ASKED)) === 'true') return;
  await requestAuthorization({ toRead: READ_TYPES });
  await AsyncStorage.setItem(KEY_HEALTH_ASKED, 'true');
}

export async function disableHealth(): Promise<void> {
  await AsyncStorage.setItem(KEY_HEALTH_ENABLED, 'false');
}

/** Latest sample per local day, oldest first. */
async function readDaily(identifier: typeof WEIGHT | typeof BODY_FAT, unit: string, days: number, scale = 1): Promise<HealthPoint[]> {
  if (!(await getHealthEnabled()) || !healthSupported()) return [];
  const startDate = new Date(Date.now() - days * 86400000);
  const samples = await queryQuantitySamples(identifier, {
    limit: 0,
    unit,
    ascending: true,
    filter: { date: { startDate } },
  });
  const byDay = new Map<string, HealthPoint>();
  for (const sample of samples) {
    const at = new Date(sample.startDate);
    const date = localDateISO(at);
    const value = Math.round(sample.quantity * scale * 10) / 10;
    if (!Number.isFinite(value) || value <= 0) continue;
    byDay.set(date, { date, at: at.toISOString(), value }); // ascending: last one wins
  }
  return [...byDay.values()];
}

/** Step totals per local day, oldest first, ending today. Days with no steps are left out. */
export async function readHealthSteps(days = 30): Promise<HealthPoint[]> {
  try {
    if (!(await getHealthEnabled()) || !healthSupported()) return [];
    await ensureAsked();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const buckets = await queryStatisticsCollectionForQuantity(
      STEPS, ['cumulativeSum'], start, { day: 1 },
      { filter: { date: { startDate: start, endDate: new Date() } }, unit: 'count' },
    );
    return buckets
      .filter(bucket => bucket.startDate && (bucket.sumQuantity?.quantity ?? 0) > 0)
      .map(bucket => {
        const at = new Date(bucket.startDate!);
        return { date: localDateISO(at), at: at.toISOString(), value: Math.round(bucket.sumQuantity!.quantity) };
      });
  } catch {
    return [];
  }
}

export function readHealthWeights(days = 365): Promise<HealthPoint[]> {
  return readDaily(WEIGHT, 'lb', days).catch(() => []);
}

/** Body fat as a percentage (HealthKit stores a fraction). */
export function readHealthBodyFat(days = 365): Promise<HealthPoint[]> {
  return readDaily(BODY_FAT, '%', days, 100).catch(() => []);
}
