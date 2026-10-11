import { Directory, File, Paths } from 'expo-file-system';

// Photos live in Documents/photos and records store only "mpp-photo:<name>".
// Two reasons: the image picker's files sit in Caches, which iOS may clear
// when storage runs low, and iOS moves the app container on updates, so a
// stored absolute file:// path can stop resolving even when the file is
// still there. Remote (http) URLs from the optional cloud path pass through.

export const PHOTO_SCHEME = 'mpp-photo:';

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

const isKept = (uri: string) => uri.startsWith(PHOTO_SCHEME);
const isRemote = (uri: string) => /^https?:/i.test(uri);
const nameOf = (stored: string) => stored.slice(PHOTO_SCHEME.length);

function newName(source: string): string {
  const ext = /\.(jpe?g|png|heic|webp)(\?|$)/i.exec(source)?.[1]?.toLowerCase() ?? 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/** Copy a picked photo into Documents/photos and return its stored reference. */
export async function keepPhoto(uri: string): Promise<string> {
  if (isKept(uri) || isRemote(uri)) return uri;
  const name = newName(uri);
  new File(uri).copy(new File(photosDir(), name));
  return PHOTO_SCHEME + name;
}

/** What <Image source={{ uri }}> needs for a stored reference. */
export function photoDisplayUri(stored?: string | null): string | undefined {
  if (!stored) return undefined;
  if (!isKept(stored)) return stored;
  return new File(photosDir(), nameOf(stored)).uri;
}

/**
 * Find an old absolute path's file after the container moved: keep the part
 * after Library/Caches/ or Documents/ and look under today's folders.
 */
function locateLegacy(uri: string): File | null {
  try {
    const direct = new File(uri);
    if (direct.exists) return direct;
  } catch {
    // Not a valid file URI; try the relative forms below.
  }
  const decoded = decodeURI(uri);
  for (const [marker, base] of [['/Library/Caches/', Paths.cache], ['/Documents/', Paths.document]] as const) {
    const at = decoded.indexOf(marker);
    if (at < 0) continue;
    const parts = decoded.slice(at + marker.length).split('/').filter(Boolean);
    const candidate = new File(base, ...parts);
    if (candidate.exists) return candidate;
  }
  return null;
}

/** Move a legacy file:// photo into Documents/photos; null if it is gone. */
export function adoptLegacyPhoto(uri: string): string | null {
  if (isKept(uri) || isRemote(uri)) return uri;
  const found = locateLegacy(uri);
  if (!found) return null;
  const name = newName(found.uri);
  found.copy(new File(photosDir(), name));
  return PHOTO_SCHEME + name;
}

export async function readPhotoBase64(stored: string): Promise<{ name: string; base64: string; size: number } | null> {
  if (!isKept(stored)) return null;
  const file = new File(photosDir(), nameOf(stored));
  if (!file.exists) return null;
  return { name: nameOf(stored), base64: await file.base64(), size: file.size ?? 0 };
}

export function writePhotoBase64(name: string, base64: string): string {
  const safe = name.replace(/[^A-Za-z0-9._-]/g, '_');
  const file = new File(photosDir(), safe);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: 'base64' });
  return PHOTO_SCHEME + safe;
}
