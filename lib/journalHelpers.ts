import * as Sentry from '@sentry/react-native';
import { supabase } from './supabase';
import { getUserId } from './auth';

export async function saveJournalEntry(date: string, note: string, timeLabel: string): Promise<void> {
  try {
    await supabase.from('day_notes').insert({ user_id: getUserId(), date, note, time_label: timeLabel });
  } catch (e) {
    Sentry.captureException(e);
  }
}

export async function updateJournalEntry(id: string, note: string): Promise<void> {
  try {
    await supabase.from('day_notes').update({ note }).eq('id', id).eq('user_id', getUserId());
  } catch (e) {
    Sentry.captureException(e);
  }
}

export type JournalEntry = { id: string; note: string; time_label: string; created_at?: string; saved?: boolean };

export async function loadJournalEntries(date: string): Promise<JournalEntry[]> {
  try {
    const { data } = await supabase
      .from('day_notes')
      .select('id, note, time_label, created_at')
      .eq('user_id', getUserId())
      .eq('date', date)
      .order('created_at', { ascending: true });
    return data || [];
  } catch (e) {
    Sentry.captureException(e);
    return [];
  }
}
