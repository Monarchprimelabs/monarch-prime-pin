import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function scheduleDate(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export async function scheduleLocalReminder(
  scheduleId: string,
  title: string,
  date: string,
  time: string,
  repeat: 'once' | 'daily' | 'weekly' = 'once',
): Promise<string> {
  const triggerDate = scheduleDate(date, time);
  if (repeat === 'once' && triggerDate.getTime() <= Date.now()) {
    throw new Error('Reminder time must be in the future.');
  }

  const permissions = await Notifications.requestPermissionsAsync();
  if (!permissions.granted) {
    throw new Error('Notification permission was not granted.');
  }

  const channelId = Platform.OS === 'android' ? 'schedule-reminders' : undefined;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('schedule-reminders', {
      name: 'Schedule reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const [hour, minute] = time.split(':').map(Number);
  const trigger: Notifications.SchedulableNotificationTriggerInput =
    repeat === 'daily'
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId }
      : repeat === 'weekly'
        // Weekly fires on the weekday of the entered date; expo weekday is 1 (Sun) – 7 (Sat).
        ? { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: triggerDate.getDay() + 1, hour, minute, channelId }
        : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate, channelId };

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Research schedule reminder',
      body: title,
      data: { scheduleId },
    },
    trigger,
  });
}

export async function cancelLocalReminder(identifier?: string): Promise<void> {
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllLocalReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
