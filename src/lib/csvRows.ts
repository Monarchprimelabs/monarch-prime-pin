import type { Injection } from '../data/peptides';
import { parseOccurrenceKey, revisionOn } from './schedule/engine';
import type { DoseSkip, Protocol } from './schedule/types';
import type { Vial } from './vials/types';

// Pure CSV assembly for exportData.ts, kept free of native modules so it
// runs under Jest.

// New columns go at the end so spreadsheets built on older exports still
// line up. Skipped planned doses are rows too (status "skipped"), so the
// file is the full dose history, not just saved records.
export const HEADERS = [
  'id', 'date', 'time', 'peptide', 'dose', 'unit', 'site',
  'severity', 'symptoms', 'weight', 'notes',
  'status', 'protocol', 'planned_date', 'planned_time', 'vial',
] as const;

export function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(injections: Injection[], protocols: Protocol[], vials: Vial[], skips: DoseSkip[]): { csv: string; count: number } {
  const protocolName = (id?: string) => (id ? protocols.find(p => p.id === id)?.compound ?? id : '');
  const vialName = (id?: string) => {
    const vial = id ? vials.find(v => v.id === id) : undefined;
    return vial ? `${vial.label} (opened ${vial.openedAt})` : id ?? '';
  };

  type Row = { sortKey: string; cells: unknown[] };
  const recordRows: Row[] = injections.map(record => {
    const planned = record.occurrenceKey ? parseOccurrenceKey(record.occurrenceKey) : null;
    return {
      sortKey: `${record.date}T${record.time}`,
      cells: [
        record.id,
        record.date,
        record.time,
        record.peptide,
        record.dose,
        record.unit,
        record.site,
        record.sev,
        (record.symptoms || []).join('; '),
        record.weight,
        record.notes || '',
        'logged',
        protocolName(record.protocolId),
        planned?.date ?? '',
        planned?.time ?? '',
        vialName(record.vialId),
      ],
    };
  });

  const skipRows: Row[] = [];
  for (const skip of skips) {
    const planned = parseOccurrenceKey(skip.occurrenceKey);
    if (!planned) continue;
    const protocol = protocols.find(p => p.id === planned.protocolId);
    const revision = protocol ? revisionOn(protocol, planned.date) : null;
    skipRows.push({
      sortKey: `${planned.date}T${planned.time}`,
      cells: [
        '', planned.date, planned.time, protocol?.compound ?? '',
        revision?.amount ?? '', revision?.unit ?? '', '', '', '', '', '',
        'skipped', protocol?.compound ?? planned.protocolId, planned.date, planned.time,
        '', // a skipped dose draws nothing from a vial
      ],
    });
  }

  // Newest first, matching the History list.
  const rows = [...recordRows, ...skipRows]
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .map(row => row.cells.map(csvEscape).join(','));
  return { csv: [HEADERS.join(','), ...rows].join('\r\n'), count: rows.length };
}
