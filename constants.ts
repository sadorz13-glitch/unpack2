// ─── KEYS & CONFIG ────────────────────────────────────────────────────────────
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!;
export const CLAUDE_MODEL = 'claude-sonnet-4-6';

// ─── STATIC DATA ──────────────────────────────────────────────────────────────
export const QUESTIONS: string[] = [
  "What's something you keep telling yourself you'll fix, but haven't?",
  "Who in your life takes more than they give, and why do you allow it?",
  "What would you do differently if you knew no one was judging you?",
  "When did you last feel genuinely proud of yourself, and what caused it?",
  "What emotion do you feel most often that you rarely talk about?",
  "What's one thing you keep promising yourself that still hasn't happened?",
  "What are you most afraid people would think if they saw the real you?",
  "Where are you settling for less than you deserve right now?",
  "What do you spend money on that doesn't actually make you happy?",
  "Who do you compare yourself to most, and how does it make you feel?",
  "What do you tell yourself about why you are the way you are?",
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
  "Who's a version of yourself you've stopped letting people see?",
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
  "What's one thing from your past that still catches you off guard?",
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

export const TRAIT_DESCRIPTIONS: Record<string, string> = {
  Openness: 'How readily you embrace new ideas, experiences, and perspectives.',
  'Self-awareness': 'How clearly you understand your own emotions, patterns, and motivations.',
  Avoidance: 'How often you sidestep difficult feelings or conversations.',
  Ambition: 'How driven you are toward goals and personal growth.',
  Resilience: 'How quickly you recover and adapt when things go wrong.',
};

export const STORAGE_KEY_HAS_SEEN_WELCOME = 'hasSeenWelcome';
export const STORAGE_KEY_HANDLED_TOPICS = 'handledTopics';
export const STORAGE_KEY_FLAGGED_TOPICS = 'flaggedTopics';
export const STORAGE_KEY_VENT_MESSAGES_USED = 'ventMessagesUsed';
export const STORAGE_KEY_HOME_CACHE = 'homeCache';
export const STORAGE_KEY_PENDING_SESSION = 'pendingSession';

export const FREE_VENT_MESSAGE_LIMIT = 5;
export const REVENUECAT_ENTITLEMENT_ID = 'premium';
export const REVIVAL_PRODUCT_ID = 'com.zute.unpack2.revival';

// Update these before shipping — required for Apple App Store compliance
export const PRIVACY_POLICY_URL = 'https://letsunpack.app/privacy/';
export const TERMS_URL = 'https://letsunpack.app/terms/';

export const DEFAULT_NOTIF_HOUR = 20;
export const DEFAULT_NOTIF_MINUTE = 0;
export const NOTIF_PREFS_KEY = 'notif_prefs';

// ─── TIMING CONSTANTS (ms) ────────────────────────────────────────────────────
/** Hard cap on a single TTS playback before giving up and moving on */
export const TTS_HARD_TIMEOUT_MS = 10000;
/** How long the "recording stopped" force-stop message stays visible */
export const FORCE_STOP_MSG_DURATION_MS = 4000;
/** Minimum time to show a session bridge in voice mode (so free users see it too) */
export const SESSION_BRIDGE_MIN_DISPLAY_MS = 4000;
/** Bridge wait duration in text (non-voice) mode */
export const SESSION_BRIDGE_TEXT_WAIT_MS = 2800;
/** Hard timeout before VAD force-stops recording */
export const VAD_HARD_TIMEOUT_MS = 30000;
