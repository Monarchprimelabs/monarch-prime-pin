import { buildCsv, HEADERS } from '../csvRows';
import type { Injection } from '../../data/peptides';
import type { Protocol } from '../schedule/types';
import type { Vial } from '../vials/types';

const protocol: Protocol = {
  id: 'p1', compound: 'Compound A', startDate: '2026-03-01', status: 'active', vialId: 'v1', createdAt: '', updatedAt: '',
  revisions: [{ effectiveFrom: '2026-03-01', anchorDate: '2026-03-01', amount: '250', unit: 'mcg', frequency: { kind: 'daily' }, times: ['08:00'], reminders: true }],
};
const vial: Vial = { id: 'v1', label: 'Compound A', total: 5000, base: 'mcg', enteredUnit: 'mg', diluentMl: 2, openedAt: '2026-03-01', status: 'active', createdAt: '', updatedAt: '' };
const base: Omit<Injection, 'id' | 'date' | 'time'> = { peptide: 'Compound A', dose: '250', unit: 'mcg', site: 'Upper L Abd', sev: 'none', weight: 0 };

test('old columns stay first and in order; new columns are appended', () => {
  expect(HEADERS.slice(0, 11)).toEqual(['id', 'date', 'time', 'peptide', 'dose', 'unit', 'site', 'severity', 'symptoms', 'weight', 'notes']);
  expect(HEADERS.slice(11)).toEqual(['status', 'protocol', 'planned_date', 'planned_time', 'vial']);
});

test('logged, unplanned and skipped rows, newest first', () => {
  const records: Injection[] = [
    { ...base, id: 'r1', date: '2026-03-01', time: '08:05', protocolId: 'p1', occurrenceKey: 'p1|2026-03-01|08:00', vialId: 'v1' },
    { ...base, id: 'r2', date: '2026-03-03', time: '12:00', notes: 'said "hi", then left' },
  ];
  const { csv, count } = buildCsv(records, [protocol], [vial], [{ occurrenceKey: 'p1|2026-03-02|08:00', skippedAt: '' }]);
  const lines = csv.split('\r\n');
  expect(count).toBe(3);
  expect(lines).toHaveLength(4);
  expect(lines[1]).toBe('r2,2026-03-03,12:00,Compound A,250,mcg,Upper L Abd,none,,0,"said ""hi"", then left",logged,,,,');
  expect(lines[2]).toBe(',2026-03-02,08:00,Compound A,250,mcg,,,,,,skipped,Compound A,2026-03-02,08:00,');
  expect(lines[3]).toBe('r1,2026-03-01,08:05,Compound A,250,mcg,Upper L Abd,none,,0,,logged,Compound A,2026-03-01,08:00,Compound A (opened 2026-03-01)');
});

test('a record linked to a deleted protocol keeps its id rather than failing', () => {
  const { csv } = buildCsv([{ ...base, id: 'r', date: '2026-03-01', time: '08:00', protocolId: 'gone', occurrenceKey: 'gone|2026-03-01|08:00' }], [], [], []);
  expect(csv.split('\r\n')[1].endsWith('logged,gone,2026-03-01,08:00,')).toBe(true);
});
