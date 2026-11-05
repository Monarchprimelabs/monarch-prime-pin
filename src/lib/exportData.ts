import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDoseSkips, getInjections, getLabResults, getProtocols, getVials } from './storage';
import { labCsv } from './labs/labs';
import { buildCsv } from './csvRows';
import { localDateISO } from './dates';

// CSV export of all locally stored injection records via the native share
// sheet. Available to FREE and Pro users alike — data portability is never
// paywalled. Records stay on-device unless the user explicitly shares the file.

export async function exportInjectionsCsv(): Promise<{ shared: boolean; count: number }> {
  const [injections, protocols, vials, skips] = await Promise.all([
    getInjections(), getProtocols(), getVials(), getDoseSkips(),
  ]);
  if (injections.length === 0 && skips.length === 0) {
    return { shared: false, count: 0 };
  }

  const { csv, count } = buildCsv(injections, protocols, vials, skips);

  const stamp = localDateISO();
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

  return { shared: true, count };
}

/** Lab results as their own CSV file (Premium screen; the data is always the user's). */
export async function exportLabCsv(): Promise<{ count: number }> {
  const results = await getLabResults();
  if (results.length === 0) return { count: 0 };
  const file = new File(Paths.cache, `monarch-prime-pin-lab-results-${localDateISO()}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(labCsv(results));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export lab results', UTI: 'public.comma-separated-values-text' });
  return { count: results.length };
}
