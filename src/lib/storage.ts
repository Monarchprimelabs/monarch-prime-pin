import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { Injection } from '../data/peptides';
import type { DoseSkip, Protocol } from './schedule/types';
import type { Vial } from './vials/types';
import { adoptLegacyPhoto, PHOTO_SCHEME } from './photos';

const KEY_INJECTIONS = '@mpp/injections';
const KEY_USER = '@mpp/user';
const KEY_ONBOARDING = '@mpp/onboarding_done';
const KEY_SCHEDULES = '@mpp/schedules';
const KEY_INVENTORY = '@mpp/inventory';
const KEY_TEMPLATES = '@mpp/templates';
const KEY_PROTOCOLS = '@mpp/protocols';
const KEY_DOSE_SKIPS = '@mpp/dose_skips';
const KEY_VIALS = '@mpp/vials';
export const KEY_REMINDER_IDS = '@mpp/reminder_map';

export type ScheduleRepeat = 'once' | 'daily' | 'weekly';

export type ScheduleEntry = {
  id: string;
  title: string;
  date: string;
  time: string;
  notes?: string;
  repeat?: ScheduleRepeat; // absent on entries saved by older builds = 'once'
  reminderEnabled?: boolean;
  notificationId?: string;
  completedAt?: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  receivedDate?: string;
  expirationDate?: string;
  lowStockAt?: number;
  notes?: string;
  /** Mass of one container in mcg. When set, injection logging accumulates
   *  usage and only offers a deduction once a full container is used up. */
  containerMassMcg?: number;
  /** Logged usage (mcg) since the last container deduction. */
  usedMcg?: number;
};

export type RecordTemplate = {
  id: string;
  title: string;
  compoundLabel?: string;
  notesPrompt?: string;
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// A corrupt stored value must never brick the app — fall back to the
// empty state instead of throwing into every screen that lists records.
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function getLocalList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return safeParse<T[]>(raw, []);
}

async function setLocalList<T>(key: string, values: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(values));
}

// ----- ONBOARDING -----
export async function getOnboardingDone(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEY_ONBOARDING);
  return val === 'true';
}

export async function setOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDING, 'true');
}

// ----- USER -----
export type LocalUser = {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
  isDeveloper: boolean;
};

export async function getUser(): Promise<LocalUser | null> {
  const raw = await AsyncStorage.getItem(KEY_USER);
  return safeParse<LocalUser | null>(raw, null);
}

export async function setUser(u: LocalUser | null) {
  if (u) await AsyncStorage.setItem(KEY_USER, JSON.stringify(u));
  else await AsyncStorage.removeItem(KEY_USER);
}

// ----- INJECTIONS -----
export async function getInjections(): Promise<Injection[]> {
  // If Supabase is configured and user is real (not guest), fetch from cloud
  if (SUPABASE_CONFIGURED && supabase) {
    const user = await getUser();
    if (user && !user.isGuest && !user.isDeveloper) {
      const { data, error } = await supabase
        .from('injections')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });
      if (!error && data) {
        return data as Injection[];
      }
    }
  }

  // Otherwise use local storage
  const raw = await AsyncStorage.getItem(KEY_INJECTIONS);
  const parsed = safeParse<Injection[] | null>(raw, null);
  if (parsed) return parsed;

  // First launch starts with an empty log.
  return [];
}

export async function saveInjection(inj: Omit<Injection, 'id'>): Promise<Injection> {
  const newInj: Injection = { ...inj, id: Date.now().toString() };

  if (SUPABASE_CONFIGURED && supabase) {
    const user = await getUser();
    if (user && !user.isGuest && !user.isDeveloper) {
      const { data, error } = await supabase
        .from('injections')
        .insert([newInj])
        .select()
        .single();
      if (!error && data) return data as Injection;
    }
  }

  // Local fallback
  const list = await getInjections();
  const updated = [newInj, ...list];
  await AsyncStorage.setItem(KEY_INJECTIONS, JSON.stringify(updated));
  return newInj;
}

export async function updateInjection(inj: Injection): Promise<Injection> {
  if (SUPABASE_CONFIGURED && supabase) {
    const user = await getUser();
    if (user && !user.isGuest && !user.isDeveloper) {
      const { id, ...changes } = inj;
      const { data, error } = await supabase
        .from('injections')
        .update(changes)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('The record could not be updated.');
      return data as Injection;
    }
  }

  const list = await getInjections();
  const index = list.findIndex(i => i.id === inj.id);
  if (index === -1) throw new Error('The record could not be found.');
  const updated = list.map(i => i.id === inj.id ? inj : i);
  await AsyncStorage.setItem(KEY_INJECTIONS, JSON.stringify(updated));
  return inj;
}

export async function deleteInjection(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED && supabase) {
    const user = await getUser();
    if (user && !user.isGuest && !user.isDeveloper) {
      const { error } = await supabase.from('injections').delete().eq('id', id);
      if (error) throw error;
      return;
    }
  }
  const list = await getInjections();
  await AsyncStorage.setItem(
    KEY_INJECTIONS,
    JSON.stringify(list.filter(i => i.id !== id))
  );
}

// ----- MANUAL ORGANIZATION TOOLS -----
export const getSchedules = () => getLocalList<ScheduleEntry>(KEY_SCHEDULES);
export async function saveSchedule(entry: Omit<ScheduleEntry, 'id'>): Promise<ScheduleEntry> {
  const saved = { ...entry, id: makeId() };
  await setLocalList(KEY_SCHEDULES, [saved, ...(await getSchedules())]);
  return saved;
}
export async function updateSchedule(entry: ScheduleEntry): Promise<ScheduleEntry> {
  const current = await getSchedules();
  if (!current.some(value => value.id === entry.id)) throw new Error('The schedule entry could not be found.');
  await setLocalList(KEY_SCHEDULES, current.map(value => value.id === entry.id ? entry : value));
  return entry;
}
export async function deleteSchedule(id: string): Promise<void> {
  await setLocalList(KEY_SCHEDULES, (await getSchedules()).filter(item => item.id !== id));
}

export const getInventory = () => getLocalList<InventoryItem>(KEY_INVENTORY);
export async function saveInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
  const saved = { ...item, id: makeId() };
  await setLocalList(KEY_INVENTORY, [saved, ...(await getInventory())]);
  return saved;
}
export async function updateInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  const current = await getInventory();
  if (!current.some(value => value.id === item.id)) throw new Error('The inventory item could not be found.');
  await setLocalList(KEY_INVENTORY, current.map(value => value.id === item.id ? item : value));
  return item;
}
export async function deleteInventoryItem(id: string): Promise<void> {
  await setLocalList(KEY_INVENTORY, (await getInventory()).filter(item => item.id !== id));
}

export const getRecordTemplates = () => getLocalList<RecordTemplate>(KEY_TEMPLATES);
export async function saveRecordTemplate(template: Omit<RecordTemplate, 'id'>): Promise<RecordTemplate> {
  const saved = { ...template, id: makeId() };
  await setLocalList(KEY_TEMPLATES, [saved, ...(await getRecordTemplates())]);
  return saved;
}
export async function deleteRecordTemplate(id: string): Promise<void> {
  await setLocalList(KEY_TEMPLATES, (await getRecordTemplates()).filter(item => item.id !== id));
}

// Older builds stored the image picker's absolute file:// path. Move those
// photos into Documents/photos once (photos.native.ts explains why).
// Local records only; a photo that can no longer be found is left as is.
export async function adoptLegacyPhotos(): Promise<number> {
  if (SUPABASE_CONFIGURED && supabase) {
    const user = await getUser();
    if (user && !user.isGuest && !user.isDeveloper) return 0;
  }
  const list = safeParse<Injection[]>(await AsyncStorage.getItem(KEY_INJECTIONS), []);
  let moved = 0;
  const updated = list.map(record => {
    if (!record.photoUri || record.photoUri.startsWith(PHOTO_SCHEME) || !record.photoUri.startsWith('file:')) return record;
    try {
      const kept = adoptLegacyPhoto(record.photoUri);
      if (!kept || kept === record.photoUri) return record;
      moved += 1;
      return { ...record, photoUri: kept };
    } catch {
      return record;
    }
  });
  if (moved > 0) await AsyncStorage.setItem(KEY_INJECTIONS, JSON.stringify(updated));
  return moved;
}

// ----- PROTOCOLS (dose plans) -----
// Local-only, like schedules and inventory. Plan edits append revisions
// (schedule/engine.reviseProtocol); records are never touched by them.
export const getProtocols = () => getLocalList<Protocol>(KEY_PROTOCOLS);
export async function saveProtocol(protocol: Protocol): Promise<Protocol> {
  const current = await getProtocols();
  const exists = current.some(value => value.id === protocol.id);
  await setLocalList(KEY_PROTOCOLS, exists
    ? current.map(value => value.id === protocol.id ? protocol : value)
    : [protocol, ...current]);
  return protocol;
}
export async function deleteProtocol(id: string): Promise<void> {
  await setLocalList(KEY_PROTOCOLS, (await getProtocols()).filter(item => item.id !== id));
  await setLocalList(KEY_DOSE_SKIPS, (await getDoseSkips()).filter(skip => !skip.occurrenceKey.startsWith(`${id}|`)));
}
export const newProtocolId = makeId;

// Skips live apart from records so they never count as a saved log, a
// free-tier log, or a CSV row.
export const getDoseSkips = () => getLocalList<DoseSkip>(KEY_DOSE_SKIPS);
export async function saveDoseSkip(occurrenceKey: string): Promise<void> {
  const current = await getDoseSkips();
  if (current.some(skip => skip.occurrenceKey === occurrenceKey)) return;
  await setLocalList(KEY_DOSE_SKIPS, [{ occurrenceKey, skippedAt: new Date().toISOString() }, ...current]);
}
export async function removeDoseSkip(occurrenceKey: string): Promise<void> {
  await setLocalList(KEY_DOSE_SKIPS, (await getDoseSkips()).filter(skip => skip.occurrenceKey !== occurrenceKey));
}

// ----- VIALS -----
export const getVials = () => getLocalList<Vial>(KEY_VIALS);
export async function saveVial(vial: Vial): Promise<Vial> {
  const current = await getVials();
  const exists = current.some(value => value.id === vial.id);
  await setLocalList(KEY_VIALS, exists ? current.map(value => value.id === vial.id ? vial : value) : [vial, ...current]);
  return vial;
}
export async function deleteVial(id: string): Promise<void> {
  await setLocalList(KEY_VIALS, (await getVials()).filter(item => item.id !== id));
  // Plans that drew from it simply stop being linked.
  const protocols = await getProtocols();
  if (protocols.some(p => p.vialId === id)) {
    await setLocalList(KEY_PROTOCOLS, protocols.map(p => p.vialId === id ? { ...p, vialId: undefined } : p));
  }
}

// ----- PHOTO UPLOAD -----
// In offline mode the local URI from expo-image-picker is fine —
// it persists across app launches because it's in app sandbox storage.
// When Supabase is configured, this uploads to the storage bucket.
export async function uploadPhoto(localUri: string): Promise<string> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localUri; // Use local URI directly
  }

  try {
    const user = await getUser();
    if (!user || user.isGuest || user.isDeveloper) return localUri;

    // Convert URI to blob and upload
    const response = await fetch(localUri);
    const blob = await response.blob();
    const fileName = `${user.id}/${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('progress-photos')
      .upload(fileName, blob, { contentType: 'image/jpeg' });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('progress-photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (e) {
    console.warn('Photo upload failed, using local URI:', e);
    return localUri;
  }
}

export async function clearLocalData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEY_INJECTIONS,
    KEY_USER,
    KEY_ONBOARDING,
    KEY_SCHEDULES,
    KEY_INVENTORY,
    KEY_TEMPLATES,
    KEY_PROTOCOLS,
    KEY_DOSE_SKIPS,
    KEY_VIALS,
    KEY_REMINDER_IDS,
  ]);
}

// Used by backup restore. Overwrites the data collections in one shot;
// account, onboarding, and entitlement state are intentionally untouched.
export async function replaceAllData(data: {
  injections: Injection[];
  schedules: ScheduleEntry[];
  inventory: InventoryItem[];
  templates: RecordTemplate[];
  protocols: Protocol[];
  doseSkips: DoseSkip[];
  vials: Vial[];
}): Promise<void> {
  await AsyncStorage.multiSet([
    [KEY_INJECTIONS, JSON.stringify(data.injections)],
    [KEY_SCHEDULES, JSON.stringify(data.schedules)],
    [KEY_INVENTORY, JSON.stringify(data.inventory)],
    [KEY_TEMPLATES, JSON.stringify(data.templates)],
    [KEY_PROTOCOLS, JSON.stringify(data.protocols)],
    [KEY_DOSE_SKIPS, JSON.stringify(data.doseSkips)],
    [KEY_VIALS, JSON.stringify(data.vials)],
  ]);
}
