import { ANTHROPIC_KEY, CLAUDE_MODEL, ANTHROPIC_API_VERSION } from '../../constants';

export async function callClaude(
  prompt: string,
  maxTokens: number,
  system?: string
): Promise<string> {
  const messages = [{ role: 'user' as const, content: prompt }];
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
