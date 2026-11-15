import { contentName, dataUriFor, readUriBase64 } from '../webMedia';

// Web build: report files stay whatever URI the picker returned; there is no
// Documents folder to keep them in. Backups carry them as base64 under a
// content-based name, and restore turns them back into data: URIs.

export async function keepReportFile(uri: string, _kind: 'image' | 'pdf'): Promise<string> {
  return uri;
}

export function reportFileUri(ref: string): string {
  return ref;
}

export function deleteReportFile(_ref: string): void {}

export function deleteAllReportFiles(): void {}

export async function readReportFileBase64(ref: string): Promise<{ name: string; base64: string } | null> {
  const read = await readUriBase64(ref);
  if (!read) return null;
  return { name: contentName(read.base64, read.mime, 'report'), base64: read.base64 };
}

export function writeReportFileBase64(name: string, base64: string): string | null {
  return dataUriFor(name, base64);
}
