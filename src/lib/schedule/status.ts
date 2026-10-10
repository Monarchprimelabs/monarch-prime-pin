import { DoseSkip, Occurrence, OccurrenceStatus } from './types';

type LoggedRecord = { id: string; date: string; time: string; occurrenceKey?: string };

export type OccurrenceView<R extends LoggedRecord = LoggedRecord> = Occurrence & {
  status: OccurrenceStatus;
  record?: R;
};

/**
 * Join planned doses with logs and skips. A planned dose today or later that
 * has neither is 'planned'; one on a past day is 'notLogged'. Wording stays
 * descriptive: the app never calls a dose late or overdue.
 */
export function withStatus<R extends LoggedRecord>(
  occurrences: Occurrence[],
  records: R[],
  skips: DoseSkip[],
  today: string,
): OccurrenceView<R>[] {
  const byKey = new Map<string, R>();
  records.forEach(record => { if (record.occurrenceKey && !byKey.has(record.occurrenceKey)) byKey.set(record.occurrenceKey, record); });
  const skipped = new Set(skips.map(s => s.occurrenceKey));
  return occurrences.map(occurrence => {
    const record = byKey.get(occurrence.key);
    if (record) return { ...occurrence, status: 'logged', record };
    if (skipped.has(occurrence.key)) return { ...occurrence, status: 'skipped' };
    return { ...occurrence, status: occurrence.date < today ? 'notLogged' : 'planned' };
  });
}

/** Logs on a day that don't match any of that day's planned doses (no plan
 *  link, or a link to a protocol that was since deleted or changed). */
export function unplannedOn<R extends LoggedRecord>(records: R[], date: string, plannedKeys: Set<string>): R[] {
  return records.filter(record => record.date === date && !(record.occurrenceKey && plannedKeys.has(record.occurrenceKey)));
}
