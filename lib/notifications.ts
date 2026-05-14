import * as Sentry from '@sentry/react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase/client';
import { getUserId } from './auth';

export const DAILY_REMINDER_ID = 'unpack-daily-reminder';
const STREAK_REMINDER_IDS = ['unpack-streak-daytime', 'unpack-streak-evening', 'unpack-streak-late'];

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function hasCompletedSessionToday(userId: string): Promise<boolean> {
  try {
    const todayMidnightUTC = new Date();
    todayMidnightUTC.setUTCHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayMidnightUTC.toISOString());
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function scheduleDailyReminder(hour = 20, minute = 0): Promise<void> {
  const uid = getUserId();
  if (uid) {
    const completed = await hasCompletedSessionToday(uid);
    if (completed) {
      await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
      return;
    }
  }
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'How was your day?',
      body: 'Take 2 minutes. You\'ll be glad you did.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as Notifications.DailyTriggerInput,
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

export async function cancelTodayReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

export async function scheduleStreakReminders(hasStreakToday: boolean): Promise<void> {
  try {
    for (const id of STREAK_REMINDER_IDS) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
    if (hasStreakToday) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const now = new Date();
    const atTime = (h: number, m: number) => { const d = new Date(now); d.setHours(h, m, 0, 0); return d; };
    const randomHour = 12 + Math.floor(Math.random() * 6);
    const randomMin = Math.floor(Math.random() * 60);
    const daytime = atTime(randomHour, randomMin);
    if (daytime > now) await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_IDS[0],
      content: { title: 'unpack', body: "you haven't unpacked today. don't skip it." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: daytime },
    });
    const evening = atTime(21, 0);
    if (evening > now) await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_IDS[1],
      content: { title: 'unpack', body: "day's almost over. still haven't unpacked." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: evening },
    });
    const late = atTime(23, 0);
    if (late > now) await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_IDS[2],
      content: { title: 'unpack', body: "it's getting late. keep your streak alive." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: late },
    });
  } catch (e) {
    Sentry.addBreadcrumb({ category: 'notifications', message: 'Failed to schedule streak reminders', level: 'warning' });
  }
}
