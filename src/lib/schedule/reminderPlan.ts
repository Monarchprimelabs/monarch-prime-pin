import { addDays, localDay, localInstant } from './days';
import { occurrencesBetween } from './engine';
import { DoseSkip, Occurrence, Protocol } from './types';

// iOS keeps at most 64 pending local notifications per app. Protocol
// reminders use a rolling window well under that, refreshed on every app
// open and every plan, log or skip change.
export const REMINDER_WINDOW_DAYS = 14;
export const REMINDER_CAP = 48;

export type PlannedReminder = { id: string; occurrenceKey: string; fireAt: Date };

export function reminderIdentifier(occurrenceKey: string): string {
  return `mpp-protocol|${occurrenceKey}`;
}

export function planReminders(
  protocols: Protocol[],
  loggedKeys: Set<string>,
  skips: DoseSkip[],
  now: Date,
  windowDays = REMINDER_WINDOW_DAYS,
  cap = REMINDER_CAP,
): { reminders: PlannedReminder[]; truncated: boolean } {
  const today = localDay(now);
  const skipped = new Set(skips.map(s => s.occurrenceKey));
  const active = protocols.filter(p => p.status === 'active');
  const upcoming = occurrencesBetween(active, today, addDays(today, windowDays - 1))
    .filter((o: Occurrence) => o.reminders && !loggedKeys.has(o.key) && !skipped.has(o.key))
    .map(o => ({ id: reminderIdentifier(o.key), occurrenceKey: o.key, fireAt: localInstant(o.date, o.time) }))
    .filter(r => r.fireAt.getTime() > now.getTime())
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  return { reminders: upcoming.slice(0, cap), truncated: upcoming.length > cap };
}
