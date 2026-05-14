import { supabase } from './supabase';
import { getUserId } from './auth';

type CalendarDay = {
  id: string | null;
  insight: string | null;
  topic: string | null;
  hasNote: boolean;
  isRevivable?: boolean;
};

type CalendarSessionRow = { id: string; created_at: string; insight: string; topic: string };
type CalendarNoteRow = { date: string; note: string };
type CalendarRevivalRow = { revived_date: string };

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

export async function loadCalendarMonth(year: number, month: number, userId?: string): Promise<Record<string, CalendarDay>> {
  const uid = getUserId();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const start = monthStart.toISOString();
  const end = monthEnd.toISOString();
  const startDate = monthStart.toLocaleDateString('en-CA');
  const endDate = new Date(year, month + 1, 0).toLocaleDateString('en-CA');

  const today = new Date().toLocaleDateString('en-CA');
  const wideStart = new Date(year, month - 2, 1);
  const wideStartIso = wideStart.toISOString();
  const wideStartDate = wideStart.toLocaleDateString('en-CA');
  const wideEndIso = new Date().toISOString();

  try {
    const [
      { data: sessionData },
      { data: noteData },
      { data: wideSessionData },
      { data: wideNoteData },
      { data: revivalData },
    ] = await Promise.all([
      supabase.from('sessions').select('id, created_at, insight, topic')
        .eq('user_id', uid).gte('created_at', start).lt('created_at', end)
        .order('created_at', { ascending: true }),
      supabase.from('day_notes').select('date, note')
        .eq('user_id', uid).gte('date', startDate).lte('date', endDate),
      supabase.from('sessions').select('created_at')
        .eq('user_id', uid).gte('created_at', wideStartIso).lte('created_at', wideEndIso),
      supabase.from('day_notes').select('date')
        .eq('user_id', uid).gte('date', wideStartDate).lte('date', today),
      supabase.from('streak_revivals').select('revived_date')
        .eq('user_id', uid).gte('revived_date', startDate).lte('revived_date', endDate),
    ]);

    const noteSet = new Set((noteData || []).map((n: CalendarNoteRow) => n.date));

    const map: Record<string, CalendarDay> = {};
    (sessionData || []).forEach((s: CalendarSessionRow) => {
      const dateKey = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(s.created_at) ? s.created_at : s.created_at + 'Z').toLocaleDateString('en-CA');
      map[dateKey] = { id: s.id, insight: s.insight, topic: s.topic, hasNote: noteSet.has(dateKey) };
    });
    (noteData || []).forEach((n: CalendarNoteRow) => {
      if (!map[n.date]) map[n.date] = { id: null, insight: null, topic: null, hasNote: true };
    });

    const activityDates = new Set<string>();
    (wideSessionData || []).forEach((s: { created_at: string }) => {
      const dateKey = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(s.created_at) ? s.created_at : s.created_at + 'Z').toLocaleDateString('en-CA');
      activityDates.add(dateKey);
    });
    (wideNoteData || []).forEach((n: { date: string }) => {
      activityDates.add(n.date);
    });

    const revivalSet = new Set((revivalData || []).map((r: CalendarRevivalRow) => r.revived_date));

    if (activityDates.size > 0) {
      const activityDatesArr = Array.from(activityDates).sort();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toLocaleDateString('en-CA');
      const yesterdayObj = new Date();
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterdayStr = yesterdayObj.toLocaleDateString('en-CA');
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const revivableDates: string[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = new Date(year, month, d).toLocaleDateString('en-CA');
        if (
          dateKey < today &&
          dateKey >= sevenDaysAgoStr &&
          !map[dateKey] &&
          !revivalSet.has(dateKey) &&
          activityDatesArr.some(ad => ad < dateKey) &&
          (dateKey === yesterdayStr || activityDatesArr.some(ad => ad > dateKey && ad <= today))
        ) {
          revivableDates.push(dateKey);
        }
      }
      // Only mark the most recent eligible missed day
      if (revivableDates.length > 0) {
        const nextRevivable = revivableDates[revivableDates.length - 1];
        map[nextRevivable] = { id: null, insight: null, topic: null, hasNote: false, isRevivable: true };
      }
    }

    return map;
  } catch (e) {
    return {};
  }
}
