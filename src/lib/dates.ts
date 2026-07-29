// Local-calendar date helpers.
//
// JS `new Date('YYYY-MM-DD')` parses as UTC midnight and
// `toISOString()` renders in UTC — so for anyone west of UTC, evening logs
// get stamped with TOMORROW's date, and date-only values can display as the
// PREVIOUS day. Every read/write of a calendar day must go through these.

/** Today's (or the given moment's) date as YYYY-MM-DD in LOCAL time. */
export function localDateISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** A stored YYYY-MM-DD as a local Date, anchored to noon so ±12h of
 *  timezone math can never cross a day boundary. */
export function parseLocalDay(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
}
