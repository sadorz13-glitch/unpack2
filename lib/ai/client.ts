import { ANTHROPIC_KEY, CLAUDE_MODEL, ANTHROPIC_API_VERSION } from '../../constants';

function sanitizeInput(text: string, maxChars = 2000): string {
  return text.replace(/\0/g, '').slice(0, maxChars);
}

export async function callClaude(
  prompt: string,
  maxTokens: number,
  system?: string
): Promise<string> {
  const messages = [{ role: 'user' as const, content: sanitizeInput(prompt) }];
  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages,
  };
  if (system) body.system = system;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Claude API error ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
}

export async function callClaudeChat(
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number
): Promise<string> {
  const safeMessages = messages.map(m => ({ ...m, content: sanitizeInput(m.content) }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages: safeMessages }),
  });
  if (!res.ok) throw new Error(`Claude API error ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
}
