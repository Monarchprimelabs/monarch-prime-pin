import AsyncStorage from '@react-native-async-storage/async-storage';
import { Injection } from '../data/peptides';
import { getInjectionSiteIds } from './sites';

// The math lives in plain JS (heatMath.js) so `node scripts/test-heat.js`
// exercises the exact code the app ships — keep all formula changes there.
const heatMath = require('./heatMath.js');

export type HeatBand = 'clear' | 'blue' | 'green' | 'yellow' | 'orange' | 'red';

export const HEAT_BAND_ORDER: HeatBand[] = ['clear', 'blue', 'green', 'yellow', 'orange', 'red'];
export const DEFAULT_HALF_LIFE_DAYS: number = heatMath.DEFAULT_HALF_LIFE_DAYS;
export const HALF_LIFE_OPTIONS: number[] = heatMath.HALF_LIFE_OPTIONS;
export const KEY_HEAT_HALF_LIFE = '@mpp/heatmap_half_life';

export const bandForHeat = (heat: number): HeatBand => heatMath.bandForHeat(heat);

export type HeatEntry = { zoneIds: string[]; timestamp: number };

// Record date/time → local-time timestamp. All heat ages are computed in the
// user's local timezone; a missing/malformed time lands at noon so the record
// still ages from the correct local day.
export function recordTimestamp(record: Pick<Injection, 'date' | 'time'>): number {
  const [year, month, day] = record.date.split('-').map(Number);
  const match = /^(\d{1,2}):(\d{2})/.exec(record.time || '');
  const hours = match ? Number(match[1]) : 12;
  const minutes = match ? Number(match[2]) : 0;
  return new Date(year, (month || 1) - 1, day || 1, hours, minutes).getTime();
}

// Convert records once, reuse across window changes and history scrubbing.
export function buildHeatEntries(records: Injection[]): HeatEntry[] {
  return records.map(record => ({
    zoneIds: getInjectionSiteIds(record),
    timestamp: recordTimestamp(record),
  }));
}

export function heatByZone(
  entries: HeatEntry[],
  nowMs: number,
  halfLifeDays: number,
  windowDays?: number,
): Record<string, number> {
  return heatMath.computeHeatByZone(entries, nowMs, halfLifeDays, windowDays);
}

export function bandsByZone(
  entries: HeatEntry[],
  nowMs: number,
  halfLifeDays: number,
  windowDays?: number,
): Record<string, HeatBand> {
  const heat = heatByZone(entries, nowMs, halfLifeDays, windowDays);
  const bands: Record<string, HeatBand> = {};
  for (const [zoneId, value] of Object.entries(heat)) bands[zoneId] = bandForHeat(value);
  return bands;
}

export async function getHeatHalfLife(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_HEAT_HALF_LIFE);
    const days = Number(raw);
    return HALF_LIFE_OPTIONS.includes(days) ? days : DEFAULT_HALF_LIFE_DAYS;
  } catch {
    return DEFAULT_HALF_LIFE_DAYS;
  }
}

export async function setHeatHalfLife(days: number): Promise<void> {
  await AsyncStorage.setItem(KEY_HEAT_HALF_LIFE, String(days));
}
