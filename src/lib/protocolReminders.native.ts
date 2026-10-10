import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatClockTime } from '../data/peptides';
import { translateNow } from './i18n';
import { addDays, localDay } from './schedule/days';
import { occurrencesBetween } from './schedule/engine';
import { planReminders, REMINDER_WINDOW_DAYS } from './schedule/reminderPlan';
import { getDoseSkips, getInjections, getProtocols, KEY_REMINDER_IDS } from './storage';

// Protocol reminders: a rolling window of one-off local notifications,
// rebuilt from the plan on app open and after every plan, log or skip
// change. Fixed identifiers make a rebuild idempotent. Text never names the
// compound (lock screens are visible to others).

const CHANNEL_ID = 'protocol-reminders';
const RENEW_ID = 'mpp-protocol|renew';

export type ReminderSyncResult = { scheduled: number; permission: 'granted' | 'denied' | 'not-needed' };

let running: Promise<ReminderSyncResult> | null = null;

export function syncProtocolReminders(options: { askPermission?: boolean } = {}): Promise<ReminderSyncResult> {
  // Serialise: two quick saves must not interleave cancel/schedule calls.
  const next = (running ?? Promise.resolve(null)).catch(() => null).then(() => runSync(options));
  running = next;
  return next;
}

async function readIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_REMINDER_IDS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function runSync({ askPermission }: { askPermission?: boolean }): Promise<ReminderSyncResult> {
  const [protocols, injections, skips] = await Promise.all([getProtocols(), getInjections(), getDoseSkips()]);
  const now = new Date();
  const logged = new Set(injections.map(r => r.occurrenceKey).filter((k): k is string => !!k));
  const { reminders, truncated } = planReminders(protocols, logged, skips, now);

  for (const id of await readIds()) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  }
  await AsyncStorage.setItem(KEY_REMINDER_IDS, '[]');
  if (reminders.length === 0) return { scheduled: 0, permission: 'not-needed' };

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && askPermission && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return { scheduled: 0, permission: 'denied' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: translateNow('proto.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const channelId = Platform.OS === 'android' ? CHANNEL_ID : undefined;

  const ids: string[] = [];
  for (const reminder of reminders) {
    const time = reminder.occurrenceKey.split('|')[2] ?? '';
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: {
        title: translateNow('proto.notifTitle'),
        body: translateNow('proto.notifBody', { time: formatClockTime(time) }),
        data: { occurrenceKey: reminder.occurrenceKey },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt, channelId },
    });
    ids.push(reminder.id);
  }

  // If the plan keeps going past the window, leave one note at its end so
  // reminders don't stop silently when the app goes unopened for two weeks.
  const last = reminders[reminders.length - 1];
  const today = localDay(now);
  const continues = truncated || occurrencesBetween(
    protocols.filter(p => p.status === 'active'),
    addDays(today, REMINDER_WINDOW_DAYS),
    addDays(today, REMINDER_WINDOW_DAYS + 60),
  ).some(o => o.reminders);
  if (continues) {
    await Notifications.scheduleNotificationAsync({
      identifier: RENEW_ID,
      content: { title: translateNow('proto.renewTitle'), body: translateNow('proto.renewBody') },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(last.fireAt.getTime() + 60 * 60 * 1000), channelId },
    });
    ids.push(RENEW_ID);
  }

  await AsyncStorage.setItem(KEY_REMINDER_IDS, JSON.stringify(ids));
  return { scheduled: reminders.length, permission: 'granted' };
}

/** Calls back with the occurrence key when the user taps a protocol reminder. */
const handledResponses = new Set<string>();

export function onProtocolReminderTap(handler: (occurrenceKey: string) => void): () => void {
  const pick = (response: Notifications.NotificationResponse | null) => {
    const key = response?.notification.request.content.data?.occurrenceKey;
    if (typeof key !== 'string') return;
    // The launch response is returned again on every call; act on it once.
    const responseId = `${response!.notification.request.identifier}@${response!.notification.date}`;
    if (handledResponses.has(responseId)) return;
    handledResponses.add(responseId);
    handler(key);
  };
  Notifications.getLastNotificationResponseAsync().then(pick).catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener(pick);
  return () => sub.remove();
}
