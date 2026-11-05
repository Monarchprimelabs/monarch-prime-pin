import type { LabReport, LabReportFile } from './types';

// Saved lab reports: plain bookkeeping only. The app never opens a report to
// read values out of it; the user types the markers they want to chart.

export const LAB_FILE_PREFIX = 'mpp-labfile:';

/** Newest draw first; same day, newest saved first. */
export function reportsNewestFirst(reports: LabReport[]): LabReport[] {
  return [...reports].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

/** Photo or PDF, from what the picker reports; null for anything else. */
export function reportFileKind(asset: { mimeType?: string | null; name?: string | null; uri: string }): 'image' | 'pdf' | null {
  const mime = (asset.mimeType ?? '').toLowerCase();
  const name = (asset.name ?? asset.uri).toLowerCase();
  if (mime === 'application/pdf' || /\.pdf(\?|$)/.test(name)) return 'pdf';
  if (mime.startsWith('image/') || /\.(jpe?g|png|heic|heif|webp)(\?|$)/.test(name)) return 'image';
  return null;
}

/**
 * Rebuild reports from a backup: each page comes back only when the backup
 * carries its file (any other reference points at the old phone), and a
 * report with no pages left is dropped.
 */
export function restoreReports(
  reports: LabReport[],
  files: Record<string, string> | undefined,
  write: (name: string, base64: string) => string | null,
): LabReport[] {
  const restored: LabReport[] = [];
  for (const report of reports) {
    if (!report || typeof report.id !== 'string' || !Array.isArray(report.files)) continue;
    const pages: LabReportFile[] = [];
    for (const page of report.files) {
      if (typeof page?.ref !== 'string' || !page.ref.startsWith(LAB_FILE_PREFIX)) continue;
      const name = page.ref.slice(LAB_FILE_PREFIX.length);
      const data = files?.[name];
      if (!data) continue;
      try {
        const ref = write(name, data);
        if (ref) pages.push({ ...page, ref });
      } catch {
        // Skip a page that can't be written; keep the rest.
      }
    }
    if (pages.length > 0) restored.push({ ...report, files: pages });
  }
  return restored;
}
