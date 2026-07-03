import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { Injection } from '../data/peptides';

const KEY_INJECTIONS = '@mpp/injections';
const KEY_USER = '@mpp/user';
const KEY_ONBOARDING = '@mpp/onboarding_done';
const KEY_SCHEDULES = '@mpp/schedules';
const KEY_INVENTORY = '@mpp/inventory';
const KEY_TEMPLATES = '@mpp/templates';

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
};

export type RecordTemplate = {
  id: string;
  title: string;
  compoundLabel?: string;
  notesPrompt?: string;
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function getLocalList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
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
  return raw ? JSON.parse(raw) : null;
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
  if (raw) return JSON.parse(raw);

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
  ]);
}
