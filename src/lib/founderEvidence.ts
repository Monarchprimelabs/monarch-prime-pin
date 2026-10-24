import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { has1xData } from './founderRules';

// Kept free of React and theme imports: App.tsx loads it before the theme.
export const KEY_EVIDENCE = '@mpp/founder_evidence_v1';
const SECURE_EVIDENCE = 'com.monarchprime.pin.founder.evidence';

type SecureStoreModule = typeof import('expo-secure-store');
function secureStore(): SecureStoreModule | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-secure-store') as SecureStoreModule;
  } catch {
    return null;
  }
}

export async function secureGet(key: string): Promise<string | null> {
  try { return (await secureStore()?.getItemAsync(key)) ?? null; } catch { return null; }
}

export async function secureSet(key: string, value: string): Promise<void> {
  const store = secureStore();
  try { await store?.setItemAsync(key, value, { keychainAccessible: store.AFTER_FIRST_UNLOCK }); } catch { /* mirror still has it */ }
}

/**
 * Records, once, whether this device held any 1.x data when 2.0 first ran.
 * App.tsx calls this before anything else reads or writes storage, so keys
 * 2.0 writes later can never count as 1.x evidence.
 */
export async function snapshotFounderEvidence(): Promise<void> {
  if ((await AsyncStorage.getItem(KEY_EVIDENCE)) !== null) return;
  const keychain = await secureGet(SECURE_EVIDENCE);
  const keys = await AsyncStorage.getAllKeys();
  // A "1" in the Keychain survives a reinstall that wiped AsyncStorage.
  const evidence = keychain === '1' || has1xData(keys) ? '1' : '0';
  await AsyncStorage.setItem(KEY_EVIDENCE, evidence);
  if (evidence === '1') await secureSet(SECURE_EVIDENCE, '1');
}

