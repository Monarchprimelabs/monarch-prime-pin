import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { translateNow } from './i18n';
import { getNextLabDate } from './storage';
import { planLabReminders } from './labs/labReminderPlan';

const KEY_IDS = '@mpp/lab_reminder_ids';
const CHANNEL_ID = 'lab-reminders';

/**
 * Reschedules the lab reminders from the saved next-lab date. `allowed` is
 * false when Premium has ended, which clears them. Neutral text only: no
 * values, no advice.
 */
export async function syncLabReminders({ allowed = true, askPermission = true }: { allowed?: boolean; askPermission?: boolean } = {}): Promise<void> {
  const old: string[] = JSON.parse((await AsyncStorage.getItem(KEY_IDS)) || '[]');
  for (const id of old) await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  await AsyncStorage.setItem(KEY_IDS, '[]');
  if (!allowed) return;

  const plan = planLabReminders(await getNextLabDate(), new Date());
  if (plan.length === 0) return;
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && askPermission && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: translateNow('labs.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const ids: string[] = [];
  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: {
        title: translateNow('labs.notifTitle'),
        body: translateNow(reminder.kind === 'before' ? 'labs.notifBefore' : reminder.kind === 'day' ? 'labs.notifDay' : 'labs.notifAfter'),
        data: { labReminder: reminder.kind },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    });
    ids.push(reminder.id);
  }
  await AsyncStorage.setItem(KEY_IDS, JSON.stringify(ids));
}
