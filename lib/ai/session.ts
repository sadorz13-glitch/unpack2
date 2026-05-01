import * as Sentry from '@sentry/react-native';
import { callClaude } from './client';
import { QAPair, SessionResult } from '../../types';

export async function getTransition(
  question: string,
  answer: string,
  nextQuestion: string,
  horoscopeContext: string = ''
): Promise<string> {
  try {
    const prompt =
      horoscopeContext +
      '\n\nYou are a warm, energetic, slightly direct therapist — think confident middle-aged woman who genuinely cares but does not sugarcoat.\n\n' +
      `The person was asked: "${question}"\nThey answered: "${answer}"\nThe next question you need to ask is: "${nextQuestion}"\n\n` +
      'Write a SHORT conversational bridge (max 15 words) that acknowledges what they said and leads into the next question. End with "And..." or "So..." or "Tell me..." so the next question flows naturally after it.\n\nJust the bridge text, nothing else.';
    return await callClaude(prompt, 60);
  } catch {
    return 'Right. And...';
  }
}

export async function generateInsightAndTraits(
  answers: QAPair[],
  horoscopeContext: string = ''
): Promise<SessionResult> {
  const answersText = answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
  const prompt =
    horoscopeContext +
    `\n\nA person just answered these journal questions:\n\n${answersText}\n\n` +
    `Do three things:\n\n` +
    `1. Write ONE sharp, slightly diss-y insight (max 10 words). Call out the contradiction or blind spot in what they said. Tone: like a brutally honest friend pointing out something obvious they are missing. No softening. Must reference something specific they said. No action word required — just make it sting a little.\n\n` +
    `2. Score these 5 personality traits from 0 to 100:\n- Openness\n- Self-awareness\n- Avoidance\n- Ambition\n- Resilience\n\n` +
    `3. Identify the single main theme in 2-3 words.\n\n` +
    `Respond in this exact JSON format only, no markdown:\n` +
    `{\n  "insight": "your insight sentence here",\n  "insightShort": "casual 5 word version with emoji",\n  "traits": {\n    "Openness": 75,\n    "Self-awareness": 60,\n    "Avoidance": 45,\n    "Ambition": 80,\n    "Resilience": 55\n  },\n  "topic": "main theme here"\n}`;

  try {
    const raw = await callClaude(prompt, 300);
    return JSON.parse(raw.replace(/```json|```/g, '').trim()) as SessionResult;
  } catch (e) {
    Sentry.captureException(e);
    throw e;
  }
}
