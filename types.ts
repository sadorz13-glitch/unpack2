export type QAPair = { question: string; answer: string };

export type TraitScores = {
  Openness: number;
  'Self-awareness': number;
  Avoidance: number;
  Ambition: number;
  Resilience: number;
};

export type SessionResult = {
  insight: string;
  insightShort: string;
  traits: TraitScores;
  topic: string;
};

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type JournalEntry = {
  id: string;
  note: string;
  time_label: string;
  created_at: string;
  saved?: boolean;
};

export type DeepDiveResult = {
  quote: string;
  what_you_said: string;
  the_pattern: string;
  something_to_sit_with: string;
  reflection_prompt: string;
};

export type CalendarDay = {
  id: string | null;
  insight: string | null;
  topic: string | null;
  hasNote: boolean;
};
