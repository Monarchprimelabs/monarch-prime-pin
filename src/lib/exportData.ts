import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getInjections } from './storage';

// CSV export of all locally stored injection records via the native share
// sheet. Available to FREE and Pro users alike — data portability is never
// paywalled. Records stay on-device unless the user explicitly shares the file.

const HEADERS = [
  'id', 'date', 'time', 'peptide', 'dose', 'unit', 'site',
  'severity', 'symptoms', 'weight', 'notes',
] as const;

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function exportInjectionsCsv(): Promise<{ shared: boolean; count: number }> {
  const injections = await getInjections();
  if (injections.length === 0) {
    return { shared: false, count: 0 };
  }

  const rows = injections.map(record => [
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
  ].map(csvEscape).join(','));

  const csv = [HEADERS.join(','), ...rows].join('\r\n');

  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `monarch-prime-pin-records-${stamp}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Monarch Prime Pin records',
    UTI: 'public.comma-separated-values-text',
  });

  return { shared: true, count: injections.length };
}
