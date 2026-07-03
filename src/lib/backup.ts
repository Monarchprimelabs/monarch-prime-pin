import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Injection } from '../data/peptides';
import {
  getInjections, getInventory, getRecordTemplates, getSchedules,
  InventoryItem, RecordTemplate, replaceAllData, ScheduleEntry,
} from './storage';

// Full local-data backup and restore, free for all users — data portability
// is never paywalled. Deliberately excludes the Pro entitlement (purchases
// restore through the App Store), funnel counters, and photo files (only
// their references would survive a device move, so they are stripped).

const BACKUP_APP_ID = 'monarch-prime-pin';
const BACKUP_VERSION = 1;

export type BackupPayload = {
  app: string;
  backupVersion: number;
  exportedAt: string;
  injections: Injection[];
  schedules: ScheduleEntry[];
  inventory: InventoryItem[];
  templates: RecordTemplate[];
};

export type BackupCounts = {
  injections: number;
  schedules: number;
  inventory: number;
  templates: number;
};

export async function exportBackup(): Promise<BackupCounts> {
  const [injections, schedules, inventory, templates] = await Promise.all([
    getInjections(), getSchedules(), getInventory(), getRecordTemplates(),
  ]);

  const payload: BackupPayload = {
    app: BACKUP_APP_ID,
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    injections,
    schedules,
    inventory,
    templates,
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

  return {
    injections: injections.length,
    schedules: schedules.length,
    inventory: inventory.length,
    templates: templates.length,
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
  if (parsed?.app !== BACKUP_APP_ID || parsed?.backupVersion !== BACKUP_VERSION) {
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
  };

  return {
    payload,
    counts: {
      injections: payload.injections.length,
      schedules: payload.schedules.length,
      inventory: payload.inventory.length,
      templates: payload.templates.length,
    },
  };
}

export async function restoreBackup(payload: BackupPayload): Promise<void> {
  await replaceAllData({
    // Photo files do not travel with the JSON; strip dead references.
    injections: payload.injections.map(record => ({ ...record, photoUri: undefined })),
    // Notification ids from the old device are meaningless here.
    schedules: payload.schedules.map(entry => ({ ...entry, notificationId: undefined, reminderEnabled: false })),
    inventory: payload.inventory,
    templates: payload.templates,
  });
}
