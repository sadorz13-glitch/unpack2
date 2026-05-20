import * as Sentry from '@sentry/react-native';
import { SUPABASE_URL, CLAUDE_MODEL } from '../../constants';
import { getAccessToken } from '../auth';
import { assertAIConsent } from '../aiConsent';

export function sanitizeInput(text: string, maxChars = 2000): string {
  return text.replace(/\0/g, '').slice(0, maxChars);
}

export async function callClaude(
  prompt: string,
  maxTokens: number,
  system?: string
): Promise<string> {
  await assertAIConsent();
  const token = await getAccessToken();
  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: sanitizeInput(prompt) }],
  };
  if (system) body.system = system;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/claude-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = new Error(`Claude proxy error ${res.status}`);
    Sentry.captureException(err);
    throw err;
  }
  const data = await res.json();
  return data.content[0].text.trim();
}

export async function callClaudeChat(
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number
): Promise<string> {
  await assertAIConsent();
  const token = await getAccessToken();
  const safeMessages = messages.map(m => ({ ...m, content: sanitizeInput(m.content) }));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/claude-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages: safeMessages }),
  });
  if (!res.ok) {
    const err = new Error(`Claude proxy error ${res.status}`);
    Sentry.captureException(err);
    throw err;
  }
  const data = await res.json();
  return data.content[0].text.trim();
}
