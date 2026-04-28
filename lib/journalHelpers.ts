import { supabase } from './supabase';
import { getUserId } from './auth';

export async function saveJournalEntry(date: string, note: string, timeLabel: string): Promise<void> {
  try {
    await supabase.from('day_notes').insert({ user_id: getUserId(), date, note, time_label: timeLabel });
  } catch (e) {}
}

export async function updateJournalEntry(id: string, note: string): Promise<void> {
  try {
    await supabase.from('day_notes').update({ note }).eq('id', id).eq('user_id', getUserId());
  } catch (e) {}
}

export async function loadJournalEntries(date: string): Promise<any[]> {
  try {
    const { data } = await supabase
      .from('day_notes')
      .select('id, note, time_label, created_at')
      .eq('user_id', getUserId())
      .eq('date', date)
      .order('created_at', { ascending: true });
    return data || [];
  } catch (e) {
    return [];
  }
}
