import * as Sentry from '@sentry/react-native';
import * as Notifications from 'expo-notifications';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'How was your day?',
      body: 'Take 2 minutes. You\'ll be glad you did.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    } as Notifications.DailyTriggerInput,
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleStreakReminders(hasStreakToday: boolean): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (hasStreakToday) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const now = new Date();
    const atTime = (h: number, m: number) => { const d = new Date(now); d.setHours(h, m, 0, 0); return d; };
    const randomHour = 12 + Math.floor(Math.random() * 6);
    const randomMin = Math.floor(Math.random() * 60);
    const daytime = atTime(randomHour, randomMin);
    if (daytime > now) await Notifications.scheduleNotificationAsync({
      content: { title: 'unpack', body: "you haven't unpacked today. don't skip it." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: daytime },
    });
    const evening = atTime(21, 0);
    if (evening > now) await Notifications.scheduleNotificationAsync({
      content: { title: 'unpack', body: "day's almost over. still haven't unpacked." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: evening },
    });
    const late = atTime(23, 0);
    if (late > now) await Notifications.scheduleNotificationAsync({
      content: { title: 'unpack', body: "it's getting late. keep your streak alive." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: late },
    });
  } catch (e) {
    Sentry.addBreadcrumb({ category: 'notifications', message: 'Failed to schedule streak reminders', level: 'warning' });
  }
}
