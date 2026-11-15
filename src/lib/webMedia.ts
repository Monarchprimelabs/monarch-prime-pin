// Web build only: photos and lab report pages are stored as the URI the
// browser picker returned (a data: URI, or a blob: URI that lasts only until
// the page reloads). These helpers turn them into base64 for a backup file
// and back into data: URIs on restore. Pure, apart from fetch for blob: URIs.

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  heic: 'image/heic', heif: 'image/heif', gif: 'image/gif', pdf: 'application/pdf',
};
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
  'image/heif': 'heif', 'image/gif': 'gif', 'application/pdf': 'pdf',
};

/** A short, stable name for the same bytes (FNV-1a over the base64 text). */
export function contentName(base64: string, mime: string, prefix: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < base64.length; i += 1) {
    hash ^= base64.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const ext = EXT_BY_MIME[mime.toLowerCase()] ?? 'jpg';
  return `${prefix}-${hash.toString(16).padStart(8, '0')}-${base64.length.toString(36)}.${ext}`;
}

/** Splits a base64 data: URI; null for anything else. */
export function parseDataUri(uri: string): { mime: string; base64: string } | null {
  const match = /^data:([^;,]+)?(;[^,]*)?;base64,(.*)$/s.exec(uri);
  if (!match) return null;
  return { mime: match[1] || 'application/octet-stream', base64: match[3] };
}

export function dataUriFor(name: string, base64: string): string {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  return `data:${MIME_BY_EXT[ext] ?? 'image/jpeg'};base64,${base64}`;
}

/** Base64 of a data: or blob: URI, or null when it can't be read. */
export async function readUriBase64(uri: string): Promise<{ mime: string; base64: string } | null> {
  const inline = parseDataUri(uri);
  if (inline) return inline;
  if (!uri.startsWith('blob:')) return null;
  const blob = await (await fetch(uri)).blob();
  const dataUri: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return parseDataUri(dataUri);
}
