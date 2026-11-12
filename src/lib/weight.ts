// One weight history from two sources: Apple Health readings and the
// weights typed into log entries. Pure, unit-tested in
// src/lib/__tests__/weight.test.ts.

export type WeightPoint = { date: string; value: number; source: 'health' | 'log' };

type LoggedWeight = { date: string; time?: string; weight: number };
type HealthWeight = { date: string; value: number };

/**
 * One reading per day, oldest first. On a day with both, the weight the
 * user typed wins over Apple Health: it's the number they chose for that day.
 */
export function mergeWeights(health: HealthWeight[], logged: LoggedWeight[]): WeightPoint[] {
  const byDay = new Map<string, WeightPoint>();
  for (const point of health) {
    if (point.value > 0) byDay.set(point.date, { date: point.date, value: point.value, source: 'health' });
  }
  const entries = logged
    .filter(entry => entry.weight > 0)
    .sort((a, b) => `${a.date}T${a.time ?? ''}`.localeCompare(`${b.date}T${b.time ?? ''}`));
  for (const entry of entries) {
    // Later entries on the same day replace earlier ones.
    byDay.set(entry.date, { date: entry.date, value: entry.weight, source: 'log' });
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** The most recent weight on or before a day, if any. */
export function weightOn(points: WeightPoint[], day: string): WeightPoint | null {
  for (let i = points.length - 1; i >= 0; i -= 1) if (points[i].date <= day) return points[i];
  return null;
}

export type WeightRange = '1M' | '3M' | '6M' | '1Y' | 'All';
export const WEIGHT_RANGES: WeightRange[] = ['1M', '3M', '6M', '1Y', 'All'];
const RANGE_DAYS: Record<Exclude<WeightRange, 'All'>, number> = { '1M': 31, '3M': 92, '6M': 183, '1Y': 366 };

/** Readings within the range ending today. */
export function inRange(points: WeightPoint[], range: WeightRange, today: string): WeightPoint[] {
  if (range === 'All') return points;
  const start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - RANGE_DAYS[range]);
  const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  return points.filter(point => point.date >= from && point.date <= today);
}

/**
 * The Apple Health reading worth offering on the log form: newer than the
 * last weight the user logged, and not offered before.
 */
export function healthWeightToOffer(
  health: HealthWeight[], logged: LoggedWeight[], day: string, alreadyOffered: string | null,
): HealthWeight | null {
  const latestHealth = [...health].reverse().find(point => point.date <= day && point.value > 0) ?? null;
  if (!latestHealth) return null;
  if (alreadyOffered === `${latestHealth.date}:${latestHealth.value}`) return null;
  const lastLogged = logged
    .filter(entry => entry.weight > 0 && entry.date <= day)
    .reduce<LoggedWeight | null>((best, entry) => (!best || entry.date > best.date ? entry : best), null);
  if (lastLogged && lastLogged.date >= latestHealth.date) return null;
  return latestHealth;
}

/** Key saved once a Health reading has been offered, so it isn't offered again. */
export const offeredKey = (point: HealthWeight) => `${point.date}:${point.value}`;
