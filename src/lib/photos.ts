// Web build: photos stay whatever URI the picker returned; there is no
// Documents folder to keep them in. Backups carry them as base64 under a
// content-based name, and restore turns them back into data: URIs.
import { contentName, dataUriFor, readUriBase64 } from './webMedia';

export const PHOTO_SCHEME = 'mpp-photo:';

export async function keepPhoto(uri: string): Promise<string> {
  return uri;
}

export function photoDisplayUri(stored?: string | null): string | undefined {
  return stored ?? undefined;
}

export function adoptLegacyPhoto(uri: string): string | null {
  return uri;
}

export async function readPhotoBase64(stored: string): Promise<{ name: string; base64: string; size: number } | null> {
  const read = await readUriBase64(stored);
  if (!read) return null;
  return { name: contentName(read.base64, read.mime, 'photo'), base64: read.base64, size: Math.floor(read.base64.length * 0.75) };
}

export function writePhotoBase64(name: string, base64: string): string | null {
  return dataUriFor(name, base64);
}
