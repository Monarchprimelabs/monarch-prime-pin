import { Directory, File, Paths } from 'expo-file-system';
import { LAB_FILE_PREFIX } from './reports';

// Lab report pages live in Documents/lab-reports and records store only
// "mpp-labfile:<name>", for the same reasons as progress photos (photos.native.ts):
// picker files sit in Caches, which iOS may clear, and the app container moves
// on updates, so absolute paths stop resolving. Nothing here leaves the phone.

function reportsDir(): Directory {
  const dir = new Directory(Paths.document, 'lab-reports');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

const nameOf = (ref: string) => ref.slice(LAB_FILE_PREFIX.length);
const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '_');

function newName(source: string, kind: 'image' | 'pdf'): string {
  const ext = kind === 'pdf' ? 'pdf' : /\.(jpe?g|png|heic|webp)(\?|$)/i.exec(source)?.[1]?.toLowerCase() ?? 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/** Copy a picked photo or PDF into Documents/lab-reports and return its reference. */
export async function keepReportFile(uri: string, kind: 'image' | 'pdf'): Promise<string> {
  if (uri.startsWith(LAB_FILE_PREFIX)) return uri;
  const name = newName(uri, kind);
  new File(uri).copy(new File(reportsDir(), name));
  return LAB_FILE_PREFIX + name;
}

/** The file:// URI for a stored reference. */
export function reportFileUri(ref: string): string {
  if (!ref.startsWith(LAB_FILE_PREFIX)) return ref;
  return new File(reportsDir(), nameOf(ref)).uri;
}

export function deleteReportFile(ref: string): void {
  if (!ref.startsWith(LAB_FILE_PREFIX)) return;
  try {
    const file = new File(reportsDir(), nameOf(ref));
    if (file.exists) file.delete();
  } catch {
    // Already gone.
  }
}

/** Used when the user erases all local data. */
export function deleteAllReportFiles(): void {
  try {
    const dir = new Directory(Paths.document, 'lab-reports');
    if (dir.exists) dir.delete();
  } catch {
    // Nothing to remove.
  }
}

export async function readReportFileBase64(ref: string): Promise<{ name: string; base64: string } | null> {
  if (!ref.startsWith(LAB_FILE_PREFIX)) return null;
  const file = new File(reportsDir(), nameOf(ref));
  if (!file.exists) return null;
  return { name: nameOf(ref), base64: await file.base64() };
}

export function writeReportFileBase64(name: string, base64: string): string {
  const safe = safeName(name);
  const file = new File(reportsDir(), safe);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: 'base64' });
  return LAB_FILE_PREFIX + safe;
}
