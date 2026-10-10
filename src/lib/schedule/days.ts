// Calendar-day arithmetic on YYYY-MM-DD strings. Works on UTC day numbers so
// no time zone or daylight-saving shift can move a day.

const MS_PER_DAY = 86400000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDay(value: string): boolean {
  const m = ISO_DAY.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayNumber(n: number): string {
  const d = new Date(n * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function addDays(iso: string, days: number): string {
  return fromDayNumber(dayNumber(iso) + days);
}

export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** 0 = Sunday … 6 = Saturday. Day 0 (1970-01-01) was a Thursday. */
export function weekdayOf(iso: string): number {
  return (((dayNumber(iso) + 4) % 7) + 7) % 7;
}

export function isHHMM(value: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

/** The local Date a wall-clock time on a local day maps to on this device.
 *  On a spring-forward day a skipped time (02:30) lands just after the gap. */
export function localInstant(date: string, time: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

/** Today's local calendar day for a given instant. */
export function localDay(at: Date): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
}
