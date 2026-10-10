import { concentration, doseInVialBase, projectVial, toVialTotal, vialUsage } from '../math';
import { Vial } from '../types';
import { planVialAlerts } from '../alerts';
import { Protocol, Frequency } from '../../schedule/types';
import { occurrenceKey } from '../../schedule/engine';

const NOW = '2026-01-01T00:00:00.000Z';
const vial = (over: Partial<Vial> = {}): Vial => ({
  id: 'v1', label: 'Compound A', ...toVialTotal(5, 'mg'), enteredUnit: 'mg', diluentMl: 2,
  openedAt: '2026-03-01', status: 'active', createdAt: NOW, updatedAt: NOW, ...over,
});
const protocol = (id: string, amount: string, frequency: Frequency, unit: Protocol['revisions'][0]['unit'] = 'mcg', times = ['08:00']): Protocol => ({
  id, compound: 'Compound A', startDate: '2026-03-01', vialId: 'v1', status: 'active', createdAt: NOW, updatedAt: NOW,
  revisions: [{ effectiveFrom: '2026-03-01', anchorDate: '2026-03-01', amount, unit, frequency, times, reminders: true }],
});

describe('unit math', () => {
  test('totals and concentration', () => {
    expect(toVialTotal(5, 'mg')).toEqual({ total: 5000, base: 'mcg' });
    expect(concentration(vial())).toBe(2500);
  });
  test('dose conversions', () => {
    const v = vial();
    expect(doseInVialBase('250', 'mcg', v)).toBe(250);
    expect(doseInVialBase('0,5', 'mg', v)).toBe(500);
    expect(doseInVialBase('0.1', 'mL', v)).toBe(250);
    expect(doseInVialBase('2', 'IU', v)).toBeNull();
    expect(doseInVialBase('2', 'IU', vial({ ...toVialTotal(100, 'IU') }))).toBe(2);
    expect(doseInVialBase('', 'mcg', v)).toBeNull();
  });
  test('usage only counts records on this vial', () => {
    const usage = vialUsage(vial(), [
      { dose: '250', unit: 'mcg', vialId: 'v1' },
      { dose: '1', unit: 'mg', vialId: 'v1' },
      { dose: '250', unit: 'mcg', vialId: 'other' },
      { dose: '250', unit: 'mcg' },
      { dose: '5', unit: 'IU', vialId: 'v1' },
    ]);
    expect(usage).toEqual({ used: 1250, remaining: 3750, unconverted: 1 });
  });
});

describe('run-out projection', () => {
  test('daily 1 mg from a 5 mg vial runs short on the sixth day', () => {
    const p = projectVial(vial(), [protocol('p1', '1', { kind: 'daily' }, 'mg')], [], [], '2026-03-01');
    expect(p.firstShort?.date).toBe('2026-03-06');
    expect(p.daysLeft).toBe(5);
    expect(p.status).toBe('low');
  });
  test('logged doses are already in remaining and are not counted twice', () => {
    const records = [{ dose: '1', unit: 'mg' as const, vialId: 'v1', occurrenceKey: occurrenceKey('p1', '2026-03-01', '08:00') }];
    const p = projectVial(vial(), [protocol('p1', '1', { kind: 'daily' }, 'mg')], records, [], '2026-03-01');
    expect(p.remaining).toBe(4000);
    expect(p.firstShort?.date).toBe('2026-03-06');
  });
  test('skipped doses draw nothing', () => {
    const skips = [{ occurrenceKey: occurrenceKey('p1', '2026-03-02', '08:00'), skippedAt: NOW }];
    const p = projectVial(vial(), [protocol('p1', '1', { kind: 'daily' }, 'mg')], [], skips, '2026-03-01');
    expect(p.firstShort?.date).toBe('2026-03-07');
  });
  test('two protocols drawing from one vial are merged in time order', () => {
    // 5000 mcg: A takes 1000 at 08:00 daily, B takes 500 at 20:00 every other day.
    const a = protocol('pa', '1000', { kind: 'daily' });
    const b = protocol('pb', '500', { kind: 'interval', everyDays: 2 }, 'mcg', ['20:00']);
    const p = projectVial(vial(), [a, b], [], [], '2026-03-01');
    // Mar 1: A 1000, B 500 -> 3500. Mar 2: A -> 2500. Mar 3: A, B -> 1000. Mar 4: A -> 0. Mar 5: A short.
    expect(p.firstShort?.key).toBe(occurrenceKey('pa', '2026-03-05', '08:00'));
    expect(p.daysLeft).toBe(4);
  });
  test('an exact fit is not flagged short', () => {
    const p = projectVial(vial({ ...toVialTotal(0.3, 'mg') }), [protocol('p1', '0.1', { kind: 'daily' }, 'mg')], [], [], '2026-03-01');
    expect(p.firstShort?.date).toBe('2026-03-04');
  });
  test('mL doses convert through concentration', () => {
    const p = projectVial(vial(), [protocol('p1', '0.4', { kind: 'daily' }, 'mL')], [], [], '2026-03-01');
    // 0.4 mL x 2500 mcg/mL = 1000 mcg a day
    expect(p.firstShort?.date).toBe('2026-03-06');
  });
  test('a plan in an unrelated unit is reported, not guessed', () => {
    const p = projectVial(vial(), [protocol('p1', '2', { kind: 'daily' }, 'IU')], [], [], '2026-03-01');
    expect(p.firstShort).toBeUndefined();
    expect(p.unconvertedPlans).toBeGreaterThan(0);
  });
  test('statuses: no plan, ok, empty, expired', () => {
    expect(projectVial(vial(), [], [], [], '2026-03-01').status).toBe('noPlan');
    expect(projectVial(vial({ ...toVialTotal(100, 'mg') }), [protocol('p1', '1', { kind: 'daily' }, 'mg')], [], [], '2026-03-01').status).toBe('ok');
    expect(projectVial(vial(), [], [{ dose: '5', unit: 'mg', vialId: 'v1' }], [], '2026-03-01').status).toBe('empty');
    expect(projectVial(vial({ status: 'empty' }), [], [], [], '2026-03-01').status).toBe('empty');
    expect(projectVial(vial({ expiresAt: '2026-02-28' }), [protocol('p1', '1', { kind: 'daily' }, 'mg')], [], [], '2026-03-01').status).toBe('expired');
  });
  test('ended protocols stop drawing', () => {
    const ended = { ...protocol('p1', '1', { kind: 'daily' }, 'mg'), status: 'ended' as const, endDate: '2026-02-28' };
    expect(projectVial(vial(), [ended], [], [], '2026-03-01').firstShort).toBeUndefined();
  });
});

describe('vial alerts', () => {
  test('a week out and the day before the first short dose, at 09:00 local', () => {
    // 20 mg at 1 mg a day from Mar 1: the 21st dose (Mar 21) is short.
    const v = vial({ ...toVialTotal(20, 'mg') });
    const alerts = planVialAlerts([v], [protocol('p1', '1', { kind: 'daily' }, 'mg')], [], [], new Date(2026, 2, 1, 7, 0));
    expect(alerts.map((a) => [a.kind, a.fireAt.getMonth() + 1, a.fireAt.getDate(), a.fireAt.getHours()]))
      .toEqual([['week', 3, 14, 9], ['short', 3, 20, 9]]);
  });
  test('past alert times are dropped and empty vials are quiet', () => {
    const alerts = planVialAlerts([vial()], [protocol('p1', '1', { kind: 'daily' }, 'mg')], [], [], new Date(2026, 2, 1, 7, 0));
    expect(alerts.map((a) => a.kind)).toEqual(['short']);
    expect(planVialAlerts([vial({ status: 'empty' })], [protocol('p1', '1', { kind: 'daily' }, 'mg')], [], [], new Date(2026, 2, 1))).toEqual([]);
  });
});
