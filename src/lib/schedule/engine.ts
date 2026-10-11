import { addDays, dayNumber, daysBetween, weekdayOf } from './days';
import { Frequency, Occurrence, Protocol, ProtocolRevision } from './types';

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function occurrenceKey(protocolId: string, date: string, time: string): string {
  return `${protocolId}|${date}|${time}`;
}

export function parseOccurrenceKey(key: string): { protocolId: string; date: string; time: string } | null {
  const parts = key.split('|');
  if (parts.length !== 3) return null;
  return { protocolId: parts[0], date: parts[1], time: parts[2] };
}

/** The revision in force on a local day, or null before the first one. */
export function revisionOn(protocol: Protocol, date: string): ProtocolRevision | null {
  let found: ProtocolRevision | null = null;
  for (const revision of protocol.revisions) {
    if (revision.effectiveFrom <= date) found = revision;
    else break;
  }
  return found;
}

export function frequencyHits(frequency: Frequency, anchorDate: string, date: string): boolean {
  const n = daysBetween(anchorDate, date);
  if (n < 0) return false;
  switch (frequency.kind) {
    case 'daily':
      return true;
    case 'interval':
      return frequency.everyDays >= 1 && mod(n, frequency.everyDays) === 0;
    case 'weekdays':
      return frequency.days.includes(weekdayOf(date) as any);
    case 'onOff': {
      const period = frequency.onDays + frequency.offDays;
      return frequency.onDays >= 1 && period >= 1 && mod(n, period) < frequency.onDays;
    }
  }
}

export function isPlannedOn(protocol: Protocol, date: string): ProtocolRevision | null {
  if (date < protocol.startDate) return null;
  if (protocol.endDate && date > protocol.endDate) return null;
  const revision = revisionOn(protocol, date);
  if (!revision || revision.times.length === 0) return null;
  if (revision.cycle) {
    const period = revision.cycle.onDays + revision.cycle.offDays;
    const n = daysBetween(revision.anchorDate, date);
    if (n < 0 || period < 1 || mod(n, period) >= revision.cycle.onDays) return null;
  }
  return frequencyHits(revision.frequency, revision.anchorDate, date) ? revision : null;
}

/** Every planned dose from `from` to `to` inclusive, in date then time order. */
export function occurrencesBetween(protocols: Protocol[], from: string, to: string): Occurrence[] {
  const result: Occurrence[] = [];
  const last = dayNumber(to);
  for (let date = from; dayNumber(date) <= last; date = addDays(date, 1)) {
    for (const protocol of protocols) {
      const revision = isPlannedOn(protocol, date);
      if (!revision) continue;
      for (const time of revision.times) {
        result.push({
          key: occurrenceKey(protocol.id, date, time),
          protocolId: protocol.id,
          compound: protocol.compound,
          date,
          time,
          amount: revision.amount,
          unit: revision.unit,
          reminders: revision.reminders,
        });
      }
    }
  }
  return result.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
}

export function sameFrequency(a: ProtocolRevision, b: Pick<ProtocolRevision, 'frequency' | 'cycle'>): boolean {
  return JSON.stringify([a.frequency, a.cycle ?? null]) === JSON.stringify([b.frequency, b.cycle ?? null]);
}

/**
 * Apply a plan edit from `today` on. Days before today keep the revision that
 * governed them, so past planned-vs-logged views never change. A same-day edit
 * replaces today's revision instead of stacking a second one. The anchor is
 * kept unless the frequency or cycle changed.
 */
export function reviseProtocol(
  protocol: Protocol,
  change: Omit<ProtocolRevision, 'effectiveFrom' | 'anchorDate'>,
  today: string,
  nowIso: string,
): Protocol {
  const effectiveFrom = today < protocol.startDate ? protocol.startDate : today;
  const current = revisionOn(protocol, effectiveFrom) ?? protocol.revisions[protocol.revisions.length - 1];
  const anchorDate = current && sameFrequency(current, change) ? current.anchorDate : effectiveFrom;
  const kept = protocol.revisions.filter(r => r.effectiveFrom < effectiveFrom);
  return {
    ...protocol,
    revisions: [...kept, { ...change, effectiveFrom, anchorDate }],
    updatedAt: nowIso,
  };
}

/** End a protocol: nothing is planned after `lastDay`. History stays. */
export function endProtocol(protocol: Protocol, lastDay: string, nowIso: string): Protocol {
  return { ...protocol, status: 'ended', endDate: lastDay < protocol.startDate ? addDays(protocol.startDate, -1) : lastDay, updatedAt: nowIso };
}
