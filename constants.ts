import { Dimensions } from 'react-native';

// ─── KEYS & CONFIG ────────────────────────────────────────────────────────────
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!;
export const CLAUDE_MODEL = 'claude-sonnet-4-6';
export const ANTHROPIC_API_VERSION = '2023-06-01';

// ─── STATIC DATA ──────────────────────────────────────────────────────────────
export const QUESTIONS: string[] = [
  "What's something you keep telling yourself you'll fix, but haven't?",
  "Who in your life takes more than they give, and why do you allow it?",
  "What would you do differently if you knew no one was judging you?",
  "When did you last feel genuinely proud of yourself, and what caused it?",
  "What emotion do you feel most often that you rarely talk about?",
  "What's the biggest gap between who you are and who you want to be?",
  "What are you most afraid people would think if they saw the real you?",
  "Where are you settling for less than you deserve right now?",
  "What do you spend money on that doesn't actually make you happy?",
  "Who do you compare yourself to most, and how does it make you feel?",
  "What's a belief you hold about yourself that might not be true?",
  "When do you feel most like yourself, and how often does that happen?",
  "What are you avoiding that you know you need to face?",
  "What does your ideal day look like, and how far is your life from that?",
  "What's something you want but feel guilty for wanting?",
  "Who do you find it hardest to say no to, and why?",
  "What part of your daily routine is draining you the most?",
  "What would you attempt if you knew you couldn't fail?",
  "What's a compliment you've received that you still don't believe?",
  "Where do you feel the most pressure in your life right now?",
  "What habit are you most ashamed of and why do you keep it?",
  "What does success look like to you, and whose definition is that?",
  "Who were you before life told you who to be?",
  "What's something you've forgiven others for but not yourself?",
  "Where do you spend energy you don't have on things that don't matter?",
  "What do you wish people understood about you without you have to explain?",
  "What are you doing out of obligation that you resent?",
  "What's the last thing that made you cry, and what does that tell you?",
  "What version of yourself are you most afraid of becoming?",
  "What would change in your life if you stopped seeking approval?",
  "What's something you pretend to be okay with that you're not?",
  "Where do you feel most out of control in your life?",
  "What do you think about right before you fall asleep?",
  "What's a decision you keep postponing and what's really stopping you?",
  "What relationship in your life needs the most work right now?",
  "What are you chasing that you're not sure you actually want?",
  "When was the last time you did something purely for yourself?",
  "What part of your past still has power over your present?",
  "What would you change about your life if money wasn't a factor?",
  "What truth are you not ready to admit to yourself yet?",
  // ── Lighter / character-revealing questions ──────────────────────────────
  "Do you prefer to take care of people or be taken care of — and does that feel like a choice?",
  "If you could make someone's day but they'd never know it was you, would you still do it?",
  "Are you more likely to say what you think or what people want to hear?",
  "Do you find it easier to forgive others or yourself?",
  "When something goes wrong, do you fix it or sit with it first?",
  "Do you need people around you to feel okay, or do you need space?",
  "Would you rather have one person who truly gets you or a room full of people who like you?",
  "Are you the person in your group who checks in on everyone else?",
  "When you're proud of something, do you share it or keep it to yourself?",
  "Do you trust your gut, or do you talk yourself out of it?",
  "Do you hold on too long or let go too quickly — in general?",
  "Are you more afraid of being too much or not enough?",
  "When someone upsets you, do you bring it up or let it pass?",
  "Would you describe yourself as someone people feel comfortable opening up to?",
  "Is there a version of your life you gave up on, and do you still think about it?",
];

export const TRAITS: string[] = ['Openness', 'Self-awareness', 'Avoidance', 'Ambition', 'Resilience'];

export const { width } = Dimensions.get('window');
export const CARD_SIZE = (width - 72) / 2;


export const STORAGE_KEY_HAS_SEEN_WELCOME = 'hasSeenWelcome';
