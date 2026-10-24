import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { purchaseFailedThisSession } from './paywallAuto';
import { mayAskForReview } from './paywallCap';

const KEY_SAVE_COUNT = '@mpp/successful_save_count';
/** 1.x asked once ever; its flag starts the 60-day clock for those users. */
const KEY_REVIEW_REQUESTED_1X = '@mpp/review_requested';
const KEY_LAST_ASKED = '@mpp/review_last_at_v1';

const SAVE_MILESTONE = 10;

export type PositiveMoment = 'tenthLog' | 'streak7' | 'export' | 'founderLoveIt';

async function lastAskedAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEY_LAST_ASKED);
  if (raw) return Number(raw);
  if (await AsyncStorage.getItem(KEY_REVIEW_REQUESTED_1X)) {
    const now = Date.now();
    await AsyncStorage.setItem(KEY_LAST_ASKED, String(now));
    return now;
  }
  return null;
}

/**
 * Asks with the system review sheet at a positive moment: the 10th log, a
 * 7-day streak, a successful export, or "Love it" on the founder sheet. At
 * most once every 60 days; never after a failed purchase or in the paywall.
 */
export async function notifyPositiveMoment(_moment: PositiveMoment): Promise<void> {
  try {
    if (!mayAskForReview(await lastAskedAt(), Date.now(), purchaseFailedThisSession())) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    await AsyncStorage.setItem(KEY_LAST_ASKED, String(Date.now()));
    await StoreReview.requestReview();
  } catch {
    // Review prompts are a nice-to-have; never block or surface errors from this.
  }
}

export async function notifySuccessfulSave(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SAVE_COUNT);
    const count = (raw ? Number(raw) : 0) + 1;
    await AsyncStorage.setItem(KEY_SAVE_COUNT, String(count));
    if (count === SAVE_MILESTONE) await notifyPositiveMoment('tenthLog');
  } catch {
    // Never block a save on this.
  }
}
