import { LAB_FILE_PREFIX } from './reports';

// Web build: report files stay whatever URI the picker returned; there is no
// Documents folder to keep them in and backups carry none.

export async function keepReportFile(uri: string, _kind: 'image' | 'pdf'): Promise<string> {
  return uri;
}

export function reportFileUri(ref: string): string {
  return ref;
}

export function deleteReportFile(_ref: string): void {}

export function deleteAllReportFiles(): void {}

export async function readReportFileBase64(_ref: string): Promise<{ name: string; base64: string } | null> {
  return null;
}

export function writeReportFileBase64(_name: string, _base64: string): string | null {
  return null;
}
