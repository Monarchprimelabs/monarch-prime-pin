import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { Injection } from '../data/peptides';

const KEY_INJECTIONS = '@mpp/injections';
const KEY_USER = '@mpp/user';
const KEY_ONBOARDING = '@mpp/onboarding_done';

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

export async function deleteInjection(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED && supabase) {
    const user = await getUser();
    if (user && !user.isGuest && !user.isDeveloper) {
      await supabase.from('injections').delete().eq('id', id);
      return;
    }
  }
  const list = await getInjections();
  await AsyncStorage.setItem(
    KEY_INJECTIONS,
    JSON.stringify(list.filter(i => i.id !== id))
  );
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
  await AsyncStorage.multiRemove([KEY_INJECTIONS, KEY_USER, KEY_ONBOARDING]);
}
