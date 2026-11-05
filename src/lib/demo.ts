import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_ZONES, Injection } from '../data/peptides';
import { localDateISO } from './dates';

// Web demo build (EXPO_PUBLIC_DEMO=true): skips sign-in and onboarding and
// fills an empty log with sample entries so every screen has something to
// show. Never set in a store build.
export const DEMO = process.env.EXPO_PUBLIC_DEMO === 'true';

const KEY_INJECTIONS = '@mpp/injections';
const KEY_ONBOARDING = '@mpp/onboarding_done';

/** About six weeks of sample entries rotating through sites. Idempotent. */
export async function seedDemoData(): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDING, 'true');
  const existing = await AsyncStorage.getItem(KEY_INJECTIONS);
  if (existing && existing !== '[]') return;
  const rotation = ['abd_ll', 'abd_lr', 'th_l', 'th_r', 'abd_ul', 'abd_ur', 'glute_l', 'glute_r', 'flk_l', 'arm_l'];
  const records: Injection[] = [];
  for (let i = 0; i < 42; i += 1) {
    if (i % 7 === 3) continue; // a rest day each week
    const day = new Date();
    day.setDate(day.getDate() - i);
    // Favor the abdomen a little, as real rotation drifts.
    const zoneId = rotation[(i * 3 + (i % 4 === 0 ? 0 : 1)) % rotation.length];
    const zone = ALL_ZONES.find(z => z.id === zoneId);
    records.push({
      id: String(Date.now() - i * 86400000),
      peptide: i % 3 === 0 ? 'Compound B' : 'Compound A',
      dose: i % 3 === 0 ? '2' : '250',
      unit: i % 3 === 0 ? 'mg' : 'mcg',
      date: localDateISO(day),
      time: i % 2 === 0 ? '08:00' : '20:30',
      site: zone ? zone.label : 'Lower Left Abdomen',
      sev: i % 9 === 0 ? 'mild' : 'none',
      weight: Math.round((182 - i * 0.12) * 10) / 10,
      notes: i === 0 ? 'Sample entry: this demo has made-up data.' : undefined,
    });
  }
  await AsyncStorage.setItem(KEY_INJECTIONS, JSON.stringify(records));
}
