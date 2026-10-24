import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { translateNow } from '../i18n';
import { localDateISO } from '../dates';
import { addDays } from '../schedule/days';
import { occurrencesBetween } from '../schedule/engine';
import { withStatus } from '../schedule/status';
import { getDoseSkips, getInjections, getProtocols, getVials } from '../storage';
import { HORIZON_DAYS, planExtraNotifications } from './plan';
import { getNotifyPrefs, getPhotoAnchor, getPremiumKnown, getTrialEndsAt } from './store';

const KEY_IDS = '@mpp/extra_notification_ids';
const CHANNEL_ID = 'summaries';

/**
 * Reschedules the non-plan notifications (follow-up, restock, weekly
 * summary, monthly report, photo check-ins, trial ending). Never asks for
 * permission: that only happens when the user sets their first plan reminder.
 */
export async function syncExtraNotifications(): Promise<void> {
  const old: string[] = JSON.parse((await AsyncStorage.getItem(KEY_IDS)) || '[]');
  for (const id of old) await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  await AsyncStorage.setItem(KEY_IDS, '[]');

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const [prefs, protocols, injections, skips, vials, premium, trialEndsAt, photoAnchor] = await Promise.all([
    getNotifyPrefs(), getProtocols(), getInjections(), getDoseSkips(), getVials(), getPremiumKnown(), getTrialEndsAt(), getPhotoAnchor(),
  ]);
  const today = localDateISO();
  const unloggedPlanDays = [...new Set(
    withStatus(occurrencesBetween(protocols.filter(p => p.status === 'active'), today, addDays(today, HORIZON_DAYS)), injections, skips, today)
      .filter(v => v.status === 'planned')
      .map(v => v.date),
  )];
  const restocks = vials
    .filter(v => v.status === 'active' && !!v.restockDate)
    .map(v => ({ vialId: v.id, date: v.restockDate as string }));

  const plan = planExtraNotifications({ prefs, now: new Date(), premium, unloggedPlanDays, restocks, trialEndsAt, photoAnchor });
  if (plan.length === 0) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: translateNow('notify.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const ids: string[] = [];
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: translateNow(n.titleKey, n.vars), body: translateNow(n.bodyKey, n.vars), data: { extra: n.kind } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.fireAt, channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined },
    });
    ids.push(n.id);
  }
  await AsyncStorage.setItem(KEY_IDS, JSON.stringify(ids));
}

/** Asks once, for an explicit opt-in (the trial-ending reminder). */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}
