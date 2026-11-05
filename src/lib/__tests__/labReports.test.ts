import { reportFileKind, reportsNewestFirst, restoreReports } from '../labs/reports';
import { labsAccess } from '../labs/labs';
import type { LabReport } from '../labs/types';

const report = (id: string, date: string, refs: string[], createdAt = `${date}T09:00:00Z`): LabReport => ({
  id, date, label: id, createdAt, files: refs.map(ref => ({ ref, kind: ref.endsWith('.pdf') ? 'pdf' : 'image' })),
});

test('reports sort by draw date, then by when they were saved', () => {
  const list = [
    report('a', '2026-05-01', ['mpp-labfile:a.jpg']),
    report('b', '2026-09-12', ['mpp-labfile:b.pdf']),
    report('c', '2026-09-12', ['mpp-labfile:c.jpg'], '2026-09-13T10:00:00Z'),
  ];
  expect(reportsNewestFirst(list).map(r => r.id)).toEqual(['c', 'b', 'a']);
});

test('only photos and PDFs can be added', () => {
  expect(reportFileKind({ uri: 'file:///x/report.PDF' })).toBe('pdf');
  expect(reportFileKind({ uri: 'file:///x/abc', mimeType: 'application/pdf' })).toBe('pdf');
  expect(reportFileKind({ uri: 'file:///x/IMG_1.HEIC' })).toBe('image');
  expect(reportFileKind({ uri: 'file:///x/abc', mimeType: 'image/png' })).toBe('image');
  expect(reportFileKind({ uri: 'file:///x/results.docx', name: 'results.docx' })).toBeNull();
});

test('restore keeps the pages the backup carries and drops reports with none', () => {
  const written: string[] = [];
  const write = (name: string, _b64: string) => { written.push(name); return `mpp-labfile:${name}`; };
  const restored = restoreReports(
    [
      report('both', '2026-09-12', ['mpp-labfile:p1.jpg', 'mpp-labfile:p2.jpg']),
      report('half', '2026-08-01', ['mpp-labfile:h1.pdf', 'mpp-labfile:missing.jpg']),
      report('none', '2026-07-01', ['mpp-labfile:gone.jpg']),
      report('oldPhone', '2026-06-01', ['file:///var/mobile/old.jpg']),
    ],
    { 'p1.jpg': 'AAA', 'p2.jpg': 'BBB', 'h1.pdf': 'CCC' },
    write,
  );
  expect(restored.map(r => [r.id, r.files.length])).toEqual([['both', 2], ['half', 1]]);
  expect(written).toEqual(['p1.jpg', 'p2.jpg', 'h1.pdf']);
});

test('restore survives a backup without report files and malformed entries', () => {
  expect(restoreReports([report('a', '2026-01-01', ['mpp-labfile:a.jpg'])], undefined, () => 'x')).toEqual([]);
  expect(restoreReports([null as any, { id: 1 } as any], {}, () => 'x')).toEqual([]);
});

test('a lapsed user with only saved reports still sees them read-only', () => {
  expect(labsAccess(false, 1)).toBe('readOnly');
  expect(labsAccess(false, 0)).toBe('paywall');
});
