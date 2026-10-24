import type { LabResult } from './types';

// Descriptive helpers only: the app never interprets a lab value. The one
// statement it makes is whether a value sits outside the range the user
// entered from their own report.

export type RangeStatus = 'below' | 'above' | 'within' | 'noRange';

export function rangeStatus(result: Pick<LabResult, 'value' | 'refLow' | 'refHigh'>): RangeStatus {
  const low = typeof result.refLow === 'number' ? result.refLow : null;
  const high = typeof result.refHigh === 'number' ? result.refHigh : null;
  if (low === null && high === null) return 'noRange';
  if (low !== null && result.value < low) return 'below';
  if (high !== null && result.value > high) return 'above';
  return 'within';
}

const markerKey = (name: string) => name.trim().toLowerCase();

/** One entry per marker, newest result first, markers sorted by latest date. */
export function latestByMarker(results: LabResult[]): { marker: string; latest: LabResult; count: number }[] {
  const groups = new Map<string, LabResult[]>();
  for (const result of results) {
    const key = markerKey(result.markerName);
    groups.set(key, [...(groups.get(key) ?? []), result]);
  }
  return [...groups.values()]
    .map(list => {
      const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
      return { marker: sorted[0].markerName, latest: sorted[0], count: sorted.length };
    })
    .sort((a, b) => b.latest.date.localeCompare(a.latest.date));
}

/** A marker's results, oldest first, for the chart. */
export function seriesFor(results: LabResult[], marker: string): LabResult[] {
  return results
    .filter(r => markerKey(r.markerName) === markerKey(marker))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const LAB_CSV_HEADER = ['date', 'panel', 'marker', 'value', 'unit', 'reference_low', 'reference_high', 'notes'];

export function labCsv(results: LabResult[]): string {
  const rows = [...results]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => [r.date, r.panelName, r.markerName, r.value, r.unit, r.refLow ?? '', r.refHigh ?? '', r.notes ?? ''].map(csvCell).join(','));
  return [LAB_CSV_HEADER.join(','), ...rows].join('\n');
}

/** Parses a typed number ("4,5" or "4.5"); null when empty or invalid. */
export function parseLabNumber(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
