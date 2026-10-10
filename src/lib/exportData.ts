import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDoseSkips, getInjections, getProtocols, getVials } from './storage';
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
