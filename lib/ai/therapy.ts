import { callClaude } from './client';
import { supabase } from '../supabase';
import { getUserId } from '../auth';

type SessionSummaryRow = { id: string; insight: string; topic: string };
type AnswerTextRow = { answer: string };

export async function loadTherapyPreview(avoidTopics: string[] = []): Promise<string> {
  try {
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select('id, insight, topic')
      .eq('user_id', getUserId())
      .order('created_at', { ascending: false })
      .limit(3);

    const ids = (recentSessions || []).map((s: SessionSummaryRow) => s.id);
    const { data: recentAnswers } = ids.length > 0
      ? await supabase
          .from('answers')
          .select('question, answer')
          .in('session_id', ids)
          .order('created_at', { ascending: false })
          .limit(6)
      : { data: [] };

    if (!recentSessions || recentSessions.length === 0) return '';

    const avoidStr =
      avoidTopics.length > 0
        ? `\n\nDo NOT generate a question about any of these already-handled topics: ${avoidTopics.join(', ')}.`
        : '';
    const context =
      'You are a direct guide. Write ONE casual question (max 8 words) that makes the user want to tap. Format like: "wanna talk about [their exact words]?" or "still thinking about [topic]?". Use their actual words. All lowercase, end with question mark only.' +
      avoidStr +
      '\n\n' +
      (recentSessions || []).map((s: SessionSummaryRow) => `${s.topic} — ${s.insight}`).join('\n') +
      '\n\n' +
      (recentAnswers || []).map((a: AnswerTextRow) => a.answer).join('\n');

    return await callClaude(context, 60);
  } catch {
    return '';
  }
}
