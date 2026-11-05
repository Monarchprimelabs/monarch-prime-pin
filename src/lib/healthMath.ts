import { localDateISO } from './dates';

// Pure helpers for expanded Apple Health trends; unit-tested.

/** HealthKit sleep values counted as asleep: unspecified, core, deep, REM. */
const ASLEEP = new Set([1, 3, 4, 5]);

/** Hours asleep per night, keyed by the local day the person woke up. */
export function sleepHoursByDay(samples: { startDate: string | Date; endDate: string | Date; value: number }[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const sample of samples) {
    if (!ASLEEP.has(sample.value)) continue;
    const start = new Date(sample.startDate).getTime();
    const end = new Date(sample.endDate).getTime();
    if (!(end > start)) continue;
    const day = localDateISO(new Date(end));
    totals[day] = (totals[day] ?? 0) + (end - start) / 3600000;
  }
  return Object.fromEntries(Object.entries(totals).map(([day, hours]) => [day, Math.round(hours * 10) / 10]));
}

/** Average of each day's samples (HRV, resting heart rate, glucose), oldest first. */
export function dailyAverages(samples: { startDate: string | Date; quantity: number }[], digits = 0): { date: string; value: number }[] {
  const groups = new Map<string, number[]>();
  for (const sample of samples) {
    if (!Number.isFinite(sample.quantity)) continue;
    const day = localDateISO(new Date(sample.startDate));
    groups.set(day, [...(groups.get(day) ?? []), sample.quantity]);
  }
  const f = 10 ** digits;
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, value: Math.round((values.reduce((x, y) => x + y, 0) / values.length) * f) / f }));
}

/** Mean of the last `days` entries' values ending today, or null without data. */
export function recentMean(points: { date: string; value: number }[], today: string, days: number): number | null {
  const start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - (days - 1));
  const from = localDateISO(start);
  const inRange = points.filter(p => p.date >= from && p.date <= today);
  if (inRange.length === 0) return null;
  return Math.round((inRange.reduce((sum, p) => sum + p.value, 0) / inRange.length) * 10) / 10;
}
