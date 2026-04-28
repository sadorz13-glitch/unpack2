import { callClaude } from './client';
import { supabase } from '../supabase';
import { getUserId } from '../auth';

export async function loadTherapyPreview(avoidTopics: string[] = []): Promise<string> {
  try {
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select('insight, topic')
      .eq('user_id', getUserId())
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: recentAnswers } = await supabase
      .from('answers')
      .select('question, answer')
      .order('created_at', { ascending: false })
      .limit(6);

    if (!recentSessions || recentSessions.length === 0) return '';

    const avoidStr =
      avoidTopics.length > 0
        ? `\n\nDo NOT generate a question about any of these already-handled topics: ${avoidTopics.join(', ')}.`
        : '';
    const context =
      'You are a direct therapist. Write ONE casual question (max 8 words) that makes the user want to tap. Format like: "wanna talk about [their exact words]?" or "still thinking about [topic]?". Use their actual words. All lowercase, end with question mark only.' +
      avoidStr +
      '\n\n' +
      (recentSessions || []).map((s: any) => `${s.topic} — ${s.insight}`).join('\n') +
      '\n\n' +
      (recentAnswers || []).map((a: any) => a.answer).join('\n');

    return await callClaude(context, 60);
  } catch {
    return '';
  }
}
