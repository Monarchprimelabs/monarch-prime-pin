import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDateISO } from '../dates';
import { NotifyPrefs, withDefaults } from './prefs';

const KEY_PREFS = '@mpp/notify_prefs_v1';
const KEY_TRIAL_ENDS = '@mpp/trial_ends_at_v1';
const KEY_PHOTO_ANCHOR = '@mpp/photo_checkin_anchor_v1';
/** Last known Premium state, so notification syncs outside React know it. */
const KEY_PREMIUM_KNOWN = '@mpp/premium_known_v1';

export async function getNotifyPrefs(): Promise<NotifyPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFS);
    return withDefaults(raw ? JSON.parse(raw) : null);
  } catch {
    return withDefaults(null);
  }
}

export async function setNotifyPrefs(next: NotifyPrefs): Promise<void> {
  const before = await getNotifyPrefs();
  await AsyncStorage.setItem(KEY_PREFS, JSON.stringify(next));
  // Photo check-ins count from the day they were turned on.
  if (before.photoCheckin === 'off' && next.photoCheckin !== 'off') {
    await AsyncStorage.setItem(KEY_PHOTO_ANCHOR, localDateISO());
  }
}

export async function getPhotoAnchor(): Promise<string> {
  return (await AsyncStorage.getItem(KEY_PHOTO_ANCHOR)) || localDateISO();
}

export async function getTrialEndsAt(): Promise<Date | null> {
  const raw = await AsyncStorage.getItem(KEY_TRIAL_ENDS);
  return raw ? new Date(raw) : null;
}

/** Saved when the user starts the annual free trial from the paywall. */
export async function setTrialEndsAt(date: Date | null): Promise<void> {
  if (date) await AsyncStorage.setItem(KEY_TRIAL_ENDS, date.toISOString());
  else await AsyncStorage.removeItem(KEY_TRIAL_ENDS);
}

export async function setPremiumKnown(premium: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_PREMIUM_KNOWN, premium ? '1' : '0');
}

export async function getPremiumKnown(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_PREMIUM_KNOWN)) === '1';
}
