import { lastLoggedBySite } from '../sites';
import type { Injection } from '../../data/peptides';

const rec = (id: string, date: string, time: string, site: string): Injection =>
  ({ id, peptide: 'A', dose: '1', unit: 'mg', date, time, site, sev: 'none', weight: 0 });

test('latest record per site, up to the log day, excluding the edited record', () => {
  const records = [
    rec('1', '2026-03-01', '08:00', 'Upper L Abd'),
    rec('2', '2026-03-04', '08:00', 'abd_ul, Lower R Abd'),
    rec('3', '2026-03-09', '08:00', 'Upper L Abd'),
    rec('4', '2026-03-05', '20:00', 'Lower R Abd'),
  ];
  expect(lastLoggedBySite(records, '2026-03-08')).toEqual({
    abd_ul: { date: '2026-03-04', time: '08:00' },
    abd_lr: { date: '2026-03-05', time: '20:00' },
  });
  expect(lastLoggedBySite(records, '2026-03-08', '2').abd_ul).toEqual({ date: '2026-03-01', time: '08:00' });
});
