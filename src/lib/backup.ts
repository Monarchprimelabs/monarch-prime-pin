import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Injection } from '../data/peptides';
import {
  getDoseSkips, getInjections, getInventory, getProtocols, getRecordTemplates, getSchedules, getVials,
  InventoryItem, RecordTemplate, replaceAllData, ScheduleEntry,
} from './storage';
import type { DoseSkip, Protocol } from './schedule/types';
import type { Vial } from './vials/types';
import { syncProtocolReminders } from './protocolReminders';
import { PHOTO_SCHEME, readPhotoBase64, writePhotoBase64 } from './photos';

// Full local-data backup and restore, free for all users — data portability
// is never paywalled. Deliberately excludes the Pro entitlement (purchases
// restore through the App Store) and funnel counters. Photos are optional:
// when included they travel inside the JSON as base64, up to
// MAX_PHOTO_BYTES; without them, photo references are stripped on restore.

// Large enough for a few hundred phone photos, small enough to stay under
// the memory a JSON string can use on an older iPhone.
const MAX_PHOTO_BYTES = 60 * 1024 * 1024;

const BACKUP_APP_ID = 'monarch-prime-pin';
export const KEY_LAST_BACKUP_AT = '@mpp/last_backup_at';
// v2 adds protocols, dose skips and vials. v1 files still restore (with none).
const BACKUP_VERSION = 2;
const READABLE_VERSIONS = [1, 2];

export type BackupPayload = {
  app: string;
  backupVersion: number;
  exportedAt: string;
  injections: Injection[];
  schedules: ScheduleEntry[];
  inventory: InventoryItem[];
  templates: RecordTemplate[];
  protocols: Protocol[];
  doseSkips: DoseSkip[];
  vials: Vial[];
  /** File name -> base64, for records whose photoUri is mpp-photo:<name>. */
  photos?: Record<string, string>;
};

export type BackupCounts = {
  injections: number;
  schedules: number;
  inventory: number;
  templates: number;
  protocols: number;
  photos: number;
  photosSkipped: number;
};

export async function exportBackup({ includePhotos = false }: { includePhotos?: boolean } = {}): Promise<BackupCounts> {
  const [injections, schedules, inventory, templates, protocols, doseSkips, vials] = await Promise.all([
    getInjections(), getSchedules(), getInventory(), getRecordTemplates(), getProtocols(), getDoseSkips(), getVials(),
  ]);

  const photos: Record<string, string> = {};
  let photoBytes = 0;
  let photosSkipped = 0;
  if (includePhotos) {
    // Newest first, so the size cap drops the oldest photos.
    const withPhotos = injections
      .filter(r => r.photoUri?.startsWith(PHOTO_SCHEME))
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
    for (const record of withPhotos) {
      const photo = await readPhotoBase64(record.photoUri!).catch(() => null);
      if (!photo) continue;
      if (photoBytes + photo.base64.length > MAX_PHOTO_BYTES) { photosSkipped += 1; continue; }
      photos[photo.name] = photo.base64;
      photoBytes += photo.base64.length;
    }
  }

  const payload: BackupPayload = {
    app: BACKUP_APP_ID,
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    injections,
    schedules,
    inventory,
    templates,
    protocols,
    doseSkips,
    vials,
    ...(includePhotos ? { photos } : {}),
  };

  const stamp = payload.exportedAt.slice(0, 10);
  const file = new File(Paths.cache, `monarch-prime-pin-backup-${stamp}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(payload));

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export Monarch Prime Pin backup',
    UTI: 'public.json',
  });

  await AsyncStorage.setItem(KEY_LAST_BACKUP_AT, payload.exportedAt).catch(() => undefined);

  return {
    injections: injections.length,
    schedules: schedules.length,
    inventory: inventory.length,
    templates: templates.length,
    protocols: protocols.length,
    photos: Object.keys(photos).length,
    photosSkipped,
  };
}

export async function pickBackupFile(): Promise<{ payload: BackupPayload; counts: BackupCounts } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const text = await readAsStringAsync(result.assets[0].uri);
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file could not be read as a backup.');
  }
  if (parsed?.app !== BACKUP_APP_ID || !READABLE_VERSIONS.includes(parsed?.backupVersion)) {
    throw new Error('This file is not a Monarch Prime Pin backup.');
  }

  const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);
  const payload: BackupPayload = {
    app: BACKUP_APP_ID,
    backupVersion: BACKUP_VERSION,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
    injections: asArray<Injection>(parsed.injections),
    schedules: asArray<ScheduleEntry>(parsed.schedules),
    inventory: asArray<InventoryItem>(parsed.inventory),
    templates: asArray<RecordTemplate>(parsed.templates),
    protocols: asArray<Protocol>(parsed.protocols),
    doseSkips: asArray<DoseSkip>(parsed.doseSkips),
    vials: asArray<Vial>(parsed.vials),
    photos: parsed.photos && typeof parsed.photos === 'object' && !Array.isArray(parsed.photos)
      ? Object.fromEntries(Object.entries(parsed.photos).filter(([, v]) => typeof v === 'string')) as Record<string, string>
      : undefined,
  };

  return {
    payload,
    counts: {
      injections: payload.injections.length,
      schedules: payload.schedules.length,
      inventory: payload.inventory.length,
      templates: payload.templates.length,
      protocols: payload.protocols.length,
      photos: Object.keys(payload.photos ?? {}).length,
      photosSkipped: 0,
    },
  };
}

export async function restoreBackup(payload: BackupPayload): Promise<void> {
  await replaceAllData({
    // Photos come back only when the backup carries the file; any other
    // reference would point at the old phone, so it's dropped.
    injections: payload.injections.map(record => {
      const name = record.photoUri?.startsWith(PHOTO_SCHEME) ? record.photoUri.slice(PHOTO_SCHEME.length) : null;
      const data = name ? payload.photos?.[name] : undefined;
      if (!name || !data) return { ...record, photoUri: undefined };
      try {
        return { ...record, photoUri: writePhotoBase64(name, data) ?? undefined };
      } catch {
        return { ...record, photoUri: undefined };
      }
    }),
    // Notification ids from the old device are meaningless here.
    schedules: payload.schedules.map(entry => ({ ...entry, notificationId: undefined, reminderEnabled: false })),
    inventory: payload.inventory,
    templates: payload.templates,
    protocols: payload.protocols,
    doseSkips: payload.doseSkips,
    vials: payload.vials,
  });
  // Protocol reminders are rebuilt from the restored plans on this device.
  await syncProtocolReminders().catch(() => undefined);
}
