// Web build: photos stay whatever URI the picker returned; there is no
// Documents folder to keep them in and backups carry none.

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

export async function readPhotoBase64(_stored: string): Promise<{ name: string; base64: string; size: number } | null> {
  return null;
}

export function writePhotoBase64(_name: string, _base64: string): string | null {
  return null;
}
