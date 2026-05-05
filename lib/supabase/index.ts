import * as Sentry from '@sentry/react-native';
import { TRAITS } from '../../constants';
import { getUserId } from '../auth';
import { supabase } from './client';

export { supabase };

import type { QAPair } from '../../types';

type StreakResult = { streak: number; total: number };

export async function saveSession(
  answers: QAPair[],
  insight: string,
  traits: Record<string, number>,
  topic: string,
  insightShort: string = ''
): Promise<void> {
  const uid = getUserId();
  if (!uid) throw new Error('Not authenticated');
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({ user_id: uid, insight, insight_short: insightShort, topic, traits })
    .select()
    .single();

  if (error) throw new Error(`Session save failed: ${error.message}`);

  const { error: ansError } = await supabase.from('answers').insert(
    answers.map(a => ({
      session_id: session.id,
      question: a.question,
      answer: a.answer,
    }))
  );

  if (ansError) throw new Error(`Answers save failed: ${ansError.message}`);
}

export async function loadStreakAndCount(
  forceToday: boolean = false
): Promise<StreakResult> {
  try {
    const uid = getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { count: exactCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid);

    const { data } = await supabase
      .from('sessions')
      .select('created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    const { data: noteData } = await supabase
      .from('day_notes')
      .select('date')
      .eq('user_id', uid);

    const { data: revivalData } = await supabase
      .from('streak_revivals')
      .select('revived_date')
      .eq('user_id', uid);

    const totalCount = exactCount ?? 0;

    const now = new Date();
    const today = now.toLocaleDateString('en-CA');

    const sessionDays = (data || []).map((s: any) =>
      new Date(
        /Z$|[+-]\d{2}:\d{2}$/.test(s.created_at) ? s.created_at : s.created_at + 'Z'
      ).toLocaleDateString('en-CA')
    );
    const noteDays = (noteData || []).map((n: any) => n.date);
    const revivalDays = (revivalData || []).map((r: any) => r.revived_date as string);
    let days = [...new Set([...sessionDays, ...noteDays, ...revivalDays])].sort().reverse();

    if (days.length === 0) {
      return { streak: forceToday ? 1 : 0, total: totalCount };
    }

    if (forceToday && !days.includes(today)) {
      days = [today, ...days];
    }

    let streak = 0;
    let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const yesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
    ).toLocaleDateString('en-CA');
    const startFrom =
      days[0] === today || days[0] === yesterday || forceToday ? today : null;
    if (!startFrom) return { streak: 0, total: totalCount };

    for (let i = 0; i < days.length; i++) {
      const expected = cursor.toLocaleDateString('en-CA');
      if (days[i] === expected) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (i === 0 && days[0] === yesterday) {
        cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        if (days[i] === cursor.toLocaleDateString('en-CA')) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return { streak, total: totalCount };
  } catch (e) {
    Sentry.captureException(e);
    return { streak: 0, total: 0 };
  }
}

export async function loadAllAnswers(): Promise<any[]> {
  try {
    const uid = getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (!sessions || sessions.length === 0) return [];

    const { data: ans } = await supabase
      .from('answers')
      .select('session_id, question, answer')
      .in('session_id', sessions.map((s: any) => s.id))
      .order('id', { ascending: true });

    const today = new Date().toLocaleDateString('en-CA');
    const toUtcDate = (ts: string) =>
      new Date(/Z$|[+-]\d{2}:\d{2}$/.test(ts) ? ts : ts + 'Z');

    return sessions.map((s: any) => {
      const dateKey = toUtcDate(s.created_at).toLocaleDateString('en-CA');
      const isToday = dateKey === today;
      const items = (ans || []).filter((a: any) => a.session_id === s.id);
      let label;
      if (isToday) {
        label = 'Today';
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        label =
          dateKey === yesterday.toLocaleDateString('en-CA')
            ? 'Yesterday'
            : new Date(dateKey + 'T12:00:00').toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              });
      }
      return { date: dateKey, sessionId: s.id, isToday, label, items };
    });
  } catch (e) {
    Sentry.captureException(e);
    return [];
  }
}

export async function loadWeeklyTraits(): Promise<Record<string, number> | null> {
  try {
    const uid = getUserId();
    if (!uid) throw new Error('Not authenticated');
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data } = await supabase
      .from('sessions')
      .select('traits')
      .eq('user_id', uid)
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) return null;

    const { count: totalCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid);
    if ((totalCount ?? 0) < 5) return null;

    const averaged: Record<string, number> = {};
    TRAITS.forEach((t: string) => {
      const vals = data
        .map((s: any) => s.traits?.[t] || 0)
        .filter((v: number) => v > 0);
      averaged[t] =
        vals.length > 0
          ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length)
          : 0;
    });
    return averaged;
  } catch (e) {
    Sentry.captureException(e);
    return null;
  }
}

export async function loadLastSession(): Promise<any> {
  try {
    const uid = getUserId();
    if (!uid) throw new Error('Not authenticated');
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return data;
  } catch (e) {
    Sentry.captureException(e);
    return null;
  }
}

export async function getVentCount(): Promise<number> {
  const userId = getUserId();
  if (!userId) return 0;
  const { data } = await supabase
    .from('profiles')
    .select('vent_messages_used')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.vent_messages_used ?? 0;
}

export async function incrementVentCount(): Promise<number> {
  const userId = getUserId();
  if (!userId) return 0;
  const { data, error } = await supabase.rpc('increment_vent_messages', { user_uuid: userId });
  if (error) return 0;
  return data as number;
}

export async function recordStreakRevival(date: string): Promise<boolean> {
  const userId = getUserId();
  if (!userId) return false;
  const { error } = await supabase
    .from('streak_revivals')
    .insert({ user_id: userId, revived_date: date });
  return !error;
}
