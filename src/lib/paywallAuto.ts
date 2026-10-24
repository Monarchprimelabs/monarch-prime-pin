import AsyncStorage from '@react-native-async-storage/async-storage';
import { AutoHistory, AutoPlacement, canAutoShow, recordAutoShow } from './paywallCap';

const KEY_HISTORY = '@mpp/paywall_auto_v1';

// Session-only flags: never show an automatic paywall mid-log or after a
// purchase failed in this session.
let loggingInProgress = false;
let purchaseFailed = false;

export function setLoggingInProgress(value: boolean) { loggingInProgress = value; }
export function markPurchaseFailed() { purchaseFailed = true; }
export function purchaseFailedThisSession() { return purchaseFailed; }

async function readHistory(): Promise<AutoHistory> {
  try {
    const raw = await AsyncStorage.getItem(KEY_HISTORY);
    return raw ? JSON.parse(raw) : { lastAutoAt: null, shown: [] };
  } catch {
    return { lastAutoAt: null, shown: [] };
  }
}

/** True when the placement may show now; records it so the caps hold. */
export async function claimAutoPaywall(placement: AutoPlacement, premium: boolean, month?: string): Promise<boolean> {
  const history = await readHistory();
  const now = Date.now();
  if (!canAutoShow(placement, { history, now, premium, loggingInProgress, purchaseFailedThisSession: purchaseFailed, month })) {
    return false;
  }
  await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(recordAutoShow(history, placement, now, month)));
  return true;
}
