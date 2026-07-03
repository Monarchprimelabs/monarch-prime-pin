import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const KEY_SAVE_COUNT = '@mpp/successful_save_count';
const KEY_REVIEW_REQUESTED = '@mpp/review_requested';

// Prompt after a few successful saves — enough for someone to feel the app's
// value, before they've necessarily hit the free-tier wall.
const REVIEW_TRIGGER_COUNT = 3;

export async function notifySuccessfulSave(): Promise<void> {
  try {
    const alreadyRequested = await AsyncStorage.getItem(KEY_REVIEW_REQUESTED);
    if (alreadyRequested) return;

    const raw = await AsyncStorage.getItem(KEY_SAVE_COUNT);
    const count = (raw ? Number(raw) : 0) + 1;
    await AsyncStorage.setItem(KEY_SAVE_COUNT, String(count));

    if (count < REVIEW_TRIGGER_COUNT) return;

    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    await AsyncStorage.setItem(KEY_REVIEW_REQUESTED, 'true');
    await StoreReview.requestReview();
  } catch {
    // Review prompts are a nice-to-have; never block or surface errors from this.
  }
}
