import { addDays, localInstant, weekdayOf } from '../days';
import { endProtocol, isPlannedOn, occurrenceKey, occurrencesBetween, reviseProtocol } from '../engine';
import { planReminders } from '../reminderPlan';
import { summarizeThrough, withStatus, unplannedOn } from '../status';
import { Frequency, Protocol, ProtocolRevision } from '../types';

const NOW = '2026-01-01T00:00:00.000Z';

function protocol(frequency: Frequency, extra: Partial<ProtocolRevision> = {}, startDate = '2026-03-02'): Protocol {
  return {
    id: 'p1',
    compound: 'Compound A',
    startDate,
    status: 'active',
    revisions: [{ effectiveFrom: startDate, anchorDate: startDate, amount: '250', unit: 'mcg', frequency, times: ['08:00'], reminders: true, ...extra }],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const plannedDays = (p: Protocol, from: string, days: number) =>
  occurrencesBetween([p], from, addDays(from, days - 1)).map(o => o.date);

describe('days', () => {
  test('weekday of known dates', () => {
    expect(weekdayOf('2026-03-02')).toBe(1); // Monday
    expect(weekdayOf('1970-01-01')).toBe(4);
    expect(weekdayOf('2024-02-29')).toBe(4);
  });
  test('addDays crosses month, year and leap day', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('frequencies', () => {
  test('daily', () => {
    expect(plannedDays(protocol({ kind: 'daily' }), '2026-03-02', 3)).toEqual(['2026-03-02', '2026-03-03', '2026-03-04']);
  });
  test('nothing before the start date', () => {
    expect(plannedDays(protocol({ kind: 'daily' }), '2026-02-27', 4)).toEqual(['2026-03-02']);
  });
  test('every other day counts from the anchor', () => {
    expect(plannedDays(protocol({ kind: 'interval', everyDays: 2 }), '2026-03-02', 7))
      .toEqual(['2026-03-02', '2026-03-04', '2026-03-06', '2026-03-08']);
  });
  test('every other day is not shifted by the month boundary', () => {
    expect(plannedDays(protocol({ kind: 'interval', everyDays: 2 }, {}, '2026-02-27'), '2026-02-27', 5))
      .toEqual(['2026-02-27', '2026-03-01', '2026-03-03']);
  });
  test('twice a week on Mon and Thu', () => {
    expect(plannedDays(protocol({ kind: 'weekdays', days: [1, 4] }), '2026-03-02', 14))
      .toEqual(['2026-03-02', '2026-03-05', '2026-03-09', '2026-03-12']);
  });
  test('5 on / 2 off', () => {
    const days = plannedDays(protocol({ kind: 'onOff', onDays: 5, offDays: 2 }), '2026-03-02', 14);
    expect(days).toEqual(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06',
      '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13']);
  });
  test('cycle layered on daily: 3 on, 4 off', () => {
    const p = protocol({ kind: 'daily' }, { cycle: { onDays: 3, offDays: 4 } });
    expect(plannedDays(p, '2026-03-02', 10)).toEqual(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-09', '2026-03-10', '2026-03-11']);
  });
  test('cycle layered on every other day', () => {
    const p = protocol({ kind: 'interval', everyDays: 2 }, { cycle: { onDays: 4, offDays: 2 } });
    expect(plannedDays(p, '2026-03-02', 8)).toEqual(['2026-03-02', '2026-03-04', '2026-03-08']);
  });
  test('several times a day, sorted', () => {
    const p = protocol({ kind: 'daily' }, { times: ['07:30', '19:00'] });
    expect(occurrencesBetween([p], '2026-03-02', '2026-03-02').map(o => o.time)).toEqual(['07:30', '19:00']);
  });
  test('two protocols on one day interleave by time', () => {
    const a = protocol({ kind: 'daily' }, { times: ['20:00'] });
    const b = { ...protocol({ kind: 'daily' }, { times: ['06:00'] }), id: 'p2', compound: 'Compound B' };
    expect(occurrencesBetween([a, b], '2026-03-02', '2026-03-02').map(o => o.compound)).toEqual(['Compound B', 'Compound A']);
  });
  test('an ended protocol plans nothing after its last day', () => {
    const p = endProtocol(protocol({ kind: 'daily' }), '2026-03-03', NOW);
    expect(plannedDays(p, '2026-03-02', 5)).toEqual(['2026-03-02', '2026-03-03']);
  });
});

describe('plan edits never rewrite the past', () => {
  const base = protocol({ kind: 'interval', everyDays: 2 });
  const rev = base.revisions[0];

  test('an amount change applies from today only', () => {
    const edited = reviseProtocol(base, { ...rev, amount: '500' }, '2026-03-10', NOW);
    const occ = occurrencesBetween([edited], '2026-03-06', '2026-03-12');
    expect(occ.map(o => [o.date, o.amount])).toEqual([
      ['2026-03-06', '250'], ['2026-03-08', '250'], ['2026-03-10', '500'], ['2026-03-12', '500'],
    ]);
  });
  test('an amount change keeps the every-other-day phase', () => {
    const edited = reviseProtocol(base, { ...rev, amount: '500' }, '2026-03-11', NOW);
    expect(plannedDays(edited, '2026-03-10', 4)).toEqual(['2026-03-10', '2026-03-12']);
  });
  test('a frequency change re-anchors on the edit day', () => {
    const edited = reviseProtocol(base, { ...rev, frequency: { kind: 'interval', everyDays: 3 } }, '2026-03-11', NOW);
    expect(plannedDays(edited, '2026-03-08', 8)).toEqual(['2026-03-08', '2026-03-10', '2026-03-11', '2026-03-14']);
  });
  test('a second edit on the same day replaces the first', () => {
    const once = reviseProtocol(base, { ...rev, amount: '500' }, '2026-03-10', NOW);
    const twice = reviseProtocol(once, { ...rev, amount: '600' }, '2026-03-10', NOW);
    expect(twice.revisions.map(r => r.amount)).toEqual(['250', '600']);
  });
  test('editing before the start replaces the plan outright', () => {
    const edited = reviseProtocol(base, { ...rev, amount: '100' }, '2026-02-01', NOW);
    expect(edited.revisions).toHaveLength(1);
    expect(edited.revisions[0].effectiveFrom).toBe('2026-03-02');
  });
  test('logged records keep their key and status after an edit', () => {
    const key = occurrenceKey('p1', '2026-03-04', '08:00');
    const edited = reviseProtocol(base, { ...rev, times: ['09:00'] }, '2026-03-10', NOW);
    const views = withStatus(occurrencesBetween([edited], '2026-03-04', '2026-03-04'),
      [{ id: 'r1', date: '2026-03-04', time: '08:12', occurrenceKey: key }], [], '2026-03-10');
    expect(views[0].status).toBe('logged');
    expect(views[0].amount).toBe('250');
  });
});

describe('status', () => {
  const p = protocol({ kind: 'daily' });
  const occ = occurrencesBetween([p], '2026-03-02', '2026-03-05');
  const today = '2026-03-04';

  test('logged, skipped, not logged and planned', () => {
    const records = [
      { id: 'a', date: '2026-03-02', time: '08:05', occurrenceKey: occ[0].key },
      // backdated late log for the 3rd, entered on the 4th
      { id: 'b', date: '2026-03-03', time: '23:40', occurrenceKey: occ[1].key },
    ];
    const views = withStatus(occ, records, [{ occurrenceKey: occ[2].key, skippedAt: NOW }], today);
    expect(views.map(v => v.status)).toEqual(['logged', 'logged', 'skipped', 'planned']);
    expect(withStatus(occ, [], [], today).map(v => v.status)).toEqual(['notLogged', 'notLogged', 'planned', 'planned']);
  });
  test('a double log counts once and keeps the first record', () => {
    const records = [
      { id: 'first', date: '2026-03-02', time: '08:00', occurrenceKey: occ[0].key },
      { id: 'second', date: '2026-03-02', time: '08:00', occurrenceKey: occ[0].key },
    ];
    expect(withStatus(occ.slice(0, 1), records, [], today)[0].record?.id).toBe('first');
  });
  test('week summary counts days up to today only', () => {
    const records = [{ id: 'a', date: '2026-03-02', time: '08:05', occurrenceKey: occ[0].key }];
    const views = withStatus(occ, records, [{ occurrenceKey: occ[1].key, skippedAt: NOW }], today);
    // Mar 2 logged, Mar 3 skipped, Mar 4 (today) planned; Mar 5 is later and left out.
    expect(summarizeThrough(views, today)).toEqual({ planned: 3, logged: 1, skipped: 1 });
  });
  test('logs not on the plan are listed separately', () => {
    const records = [
      { id: 'x', date: '2026-03-04', time: '12:00' },
      { id: 'y', date: '2026-03-04', time: '08:00', occurrenceKey: occ[2].key },
      { id: 'z', date: '2026-03-04', time: '09:00', occurrenceKey: 'deleted-protocol|2026-03-04|09:00' },
    ];
    expect(unplannedOn(records, '2026-03-04', new Set([occ[2].key])).map(r => r.id)).toEqual(['x', 'z']);
  });
});

// Jest's sandbox can't switch time zones mid-run, so `npm test` runs this
// whole file under UTC, America/New_York and Asia/Tokyo (see package.json).
const TZ = process.env.TZ ?? '';
const inZone = (zone: string) => (TZ === zone ? test : test.skip);

describe('reminders, time zones and daylight saving', () => {
  inZone('America/New_York')('wall-clock times survive spring forward (US, 2026-03-08)', () => {
    const p = protocol({ kind: 'daily' }, { times: ['08:00'] }, '2026-03-07');
    const { reminders } = planReminders([p], new Set(), [], new Date(2026, 2, 7, 0, 0), 3);
    expect(reminders.map(r => [r.fireAt.getDate(), r.fireAt.getHours(), r.fireAt.getMinutes()]))
      .toEqual([[7, 8, 0], [8, 8, 0], [9, 8, 0]]);
    // 23 real hours across the change, 24 after it
    expect((reminders[1].fireAt.getTime() - reminders[0].fireAt.getTime()) / 3600000).toBe(23);
    expect((reminders[2].fireAt.getTime() - reminders[1].fireAt.getTime()) / 3600000).toBe(24);
  });
  inZone('America/New_York')('a time inside the spring-forward gap still fires that day, after the gap', () => {
    const at = localInstant('2026-03-08', '02:30');
    expect(at.getDate()).toBe(8);
    expect(at.getHours()).toBe(3);
  });
  inZone('America/New_York')('fall back fires once at the wall-clock time', () => {
    const p = protocol({ kind: 'daily' }, { times: ['01:30'] }, '2026-11-01');
    const { reminders } = planReminders([p], new Set(), [], new Date(2026, 10, 1, 0, 0), 1);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].fireAt.getHours()).toBe(1);
    expect(reminders[0].fireAt.getTimezoneOffset()).toBe(240); // the first 1:30, still EDT
  });
  // Travel: reminders are re-planned on every app open, in whatever zone the
  // phone is in. The same instant gives 8:00 local in every zone, keyed to
  // that zone's local day.
  test('travel: reminders land at 8:00 local, on the local day, in this zone', () => {
    const p = protocol({ kind: 'daily' }, { times: ['08:00'] }, '2026-03-02');
    const now = new Date('2026-03-10T07:00:00Z');
    const { reminders } = planReminders([p], new Set(), [], now, 2);
    expect(reminders[0].fireAt.getHours()).toBe(8);
    expect(reminders[0].fireAt.getTime()).toBeGreaterThan(now.getTime());
    const expectedDay = TZ === 'Asia/Tokyo' ? '2026-03-11' : '2026-03-10'; // 16:00 already in Tokyo
    expect(reminders[0].occurrenceKey).toBe(occurrenceKey('p1', expectedDay, '08:00'));
  });
  test('logged, skipped and past doses get no reminder, and the window is capped', () => {
    const p = protocol({ kind: 'daily' }, { times: ['06:00', '08:00', '10:00', '12:00'] }, '2026-03-02');
    const now = new Date(2026, 2, 2, 9, 0);
    const logged = new Set([occurrenceKey('p1', '2026-03-02', '10:00')]);
    const skips = [{ occurrenceKey: occurrenceKey('p1', '2026-03-02', '12:00'), skippedAt: NOW }];
    expect(planReminders([p], logged, skips, now, 1).reminders).toHaveLength(0);
    const capped = planReminders([p], new Set(), [], now, 14, 10);
    expect(capped.reminders).toHaveLength(10);
    expect(capped.truncated).toBe(true);
  });
  test('reminders off or protocol ended means no reminders', () => {
    const quiet = protocol({ kind: 'daily' }, { reminders: false });
    const ended = endProtocol(protocol({ kind: 'daily' }), '2026-03-01', NOW);
    expect(planReminders([quiet, ended], new Set(), [], new Date(2026, 2, 2), 7).reminders).toHaveLength(0);
  });
});
