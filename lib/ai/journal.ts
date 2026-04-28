import { callClaude } from './client';

export async function generateJournalPrompt(
  insight: string,
  topic: string,
  horoscopeContext: string
): Promise<string> {
  const context = insight
    ? `The person's latest session insight: "${insight}". Session topic: "${topic}".`
    : 'No recent session data available.';
  const prompt =
    horoscopeContext +
    '\n\n' +
    context +
    '\n\nSuggest ONE casual, low-key journaling topic for this person — like a friend saying "what about..." or "how was...". Based on their recent experiences if available, otherwise something everyday. Warm, easy, zero pressure. Max 15 words. No question mark required.';
  try {
    return await callClaude(prompt, 60);
  } catch {
    return '';
  }
}

export async function generateJournalReflection(
  entry: string,
  horoscopeContext: string
): Promise<string> {
  const prompt =
    horoscopeContext +
    `\n\nSomeone just wrote in their journal:\n\n"${entry}"\n\nAsk ONE short, curious follow-up question that makes them want to write more — like "what made it so good?" or "what was the best part?". Warm, casual, zero pressure. Max 10 words.`;
  try {
    return await callClaude(prompt, 80);
  } catch {
    return '';
  }
}
