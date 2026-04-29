import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveJournalEntry } from './journalHelpers';

const QUEUE_KEY = 'offlineJournalQueue';

type PendingEntry = { date: string; note: string; timeLabel: string };

async function getQueue(): Promise<PendingEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addPendingEntry(date: string, note: string, timeLabel: string): Promise<void> {
  const queue = await getQueue();
  queue.push({ date, note, timeLabel });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushPendingEntries(): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;
  await AsyncStorage.removeItem(QUEUE_KEY);
  for (const entry of queue) {
    await saveJournalEntry(entry.date, entry.note, entry.timeLabel);
  }
}
