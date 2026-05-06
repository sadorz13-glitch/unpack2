import { supabase } from './supabase';
import { getUserId } from './auth';

type CalendarDay = {
  id: string | null;
  insight: string | null;
  topic: string | null;
  hasNote: boolean;
};

export async function loadDayNote(date: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('day_notes')
      .select('note')
      .eq('user_id', getUserId())
      .eq('date', date)
      .limit(1)
      .single();
    return data?.note || '';
  } catch (e) {
    return '';
  }
}

export async function loadCalendarMonth(year: number, month: number): Promise<Record<string, CalendarDay>> {
  const uid = getUserId();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const start = monthStart.toISOString();
  const end = monthEnd.toISOString();
  const startDate = monthStart.toLocaleDateString('en-CA');
  const endDate = new Date(year, month + 1, 0).toLocaleDateString('en-CA');

  try {
    const [{ data: sessionData }, { data: noteData }] = await Promise.all([
      supabase.from('sessions').select('id, created_at, insight, topic')
        .eq('user_id', uid).gte('created_at', start).lt('created_at', end)
        .order('created_at', { ascending: true }),
      supabase.from('day_notes').select('date, note')
        .eq('user_id', uid).gte('date', startDate).lte('date', endDate),
    ]);

    const noteSet = new Set((noteData || []).map((n: any) => n.date));

    const map: Record<string, CalendarDay> = {};
    (sessionData || []).forEach((s: any) => {
      const dateKey = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(s.created_at) ? s.created_at : s.created_at + 'Z').toLocaleDateString('en-CA');
      map[dateKey] = { id: s.id, insight: s.insight, topic: s.topic, hasNote: noteSet.has(dateKey) };
    });
    (noteData || []).forEach((n: any) => {
      if (!map[n.date]) map[n.date] = { id: null, insight: null, topic: null, hasNote: true };
    });
    return map;
  } catch (e) {
    return {};
  }
}
