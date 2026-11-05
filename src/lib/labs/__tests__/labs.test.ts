import { labCsv, latestByMarker, parseLabNumber, rangeStatus, seriesFor } from '../labs';
import { suggestMarkers } from '../markers';
import type { LabResult } from '../types';

const lab = (id: string, date: string, marker: string, value: number, extra: Partial<LabResult> = {}): LabResult =>
  ({ id, date, panelName: 'Panel', markerName: marker, value, unit: 'ng/dL', createdAt: `${date}T10:00:00Z`, ...extra });

test('range status uses only the range the user entered', () => {
  expect(rangeStatus({ value: 5, refLow: 10, refHigh: 20 })).toBe('below');
  expect(rangeStatus({ value: 25, refLow: 10, refHigh: 20 })).toBe('above');
  expect(rangeStatus({ value: 15, refLow: 10, refHigh: 20 })).toBe('within');
  expect(rangeStatus({ value: 15, refHigh: 20 })).toBe('within');
  expect(rangeStatus({ value: 15 })).toBe('noRange');
});

test('latest per marker and a chart series, case-insensitive by name', () => {
  const results = [lab('1', '2026-01-01', 'Ferritin', 40), lab('2', '2026-03-01', 'ferritin', 55), lab('3', '2026-02-01', 'TSH', 2)];
  const latest = latestByMarker(results);
  expect(latest.map(l => [l.marker, l.latest.value, l.count])).toEqual([['ferritin', 55, 2], ['TSH', 2, 1]]);
  expect(seriesFor(results, 'FERRITIN').map(r => r.value)).toEqual([40, 55]);
});

test('CSV export quotes text and keeps every field', () => {
  const csv = labCsv([lab('1', '2026-01-01', 'LDL, calculated', 100, { refLow: 0, refHigh: 99, notes: 'said "fasting"' })]);
  expect(csv.split('\n')[0]).toBe('date,panel,marker,value,unit,reference_low,reference_high,notes');
  expect(csv.split('\n')[1]).toBe('2026-01-01,Panel,"LDL, calculated",100,ng/dL,0,99,"said ""fasting"""');
});

test('typed numbers accept a comma decimal; marker suggestions are names only', () => {
  expect(parseLabNumber('4,5')).toBe(4.5);
  expect(parseLabNumber('')).toBeNull();
  expect(parseLabNumber('abc')).toBeNull();
  expect(suggestMarkers('test', [])).toEqual(['Total testosterone', 'Free testosterone']);
  expect(suggestMarkers('ferr', ['Ferritin (serum)'])[0]).toBe('Ferritin (serum)');
});

import { planLabReminders } from '../labReminderPlan';

test('lab reminders: 3 days before, the day, and the day after, at 9:00, future only', () => {
  const plan = planLabReminders('2026-12-10', new Date(2026, 11, 1, 12));
  expect(plan.map(r => [r.kind, r.fireAt.getDate(), r.fireAt.getHours()])).toEqual([
    ['before', 7, 9], ['day', 10, 9], ['after', 11, 9],
  ]);
  expect(planLabReminders('2026-12-10', new Date(2026, 11, 10, 10)).map(r => r.kind)).toEqual(['after']);
  expect(planLabReminders(null, new Date())).toEqual([]);
});
