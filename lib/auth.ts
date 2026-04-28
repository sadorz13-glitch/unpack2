import { supabase } from './supabaseClient';

let _userId: string | null = null;

export function getUserId(): string | null {
  return _userId;
}

export function setAuthUser(uid: string | null) {
  _userId = uid;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  _userId = null;
}

type Profile = { name: string; dob: string } | null;
type AuthResult = { userId: string | null; profile: Profile };

export async function initAuth(): Promise<AuthResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { userId: null, profile: null };
  _userId = session.user.id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, dob')
    .eq('user_id', _userId)
    .maybeSingle();
  return { userId: _userId, profile: profile ?? null };
}

const ZODIAC_CONTEXTS: Record<string, string> = {
  Aries: 'The user is an Aries (March 21 – April 19). They are driven and impulsive, often acting before thinking. They crave action and resist being told what to do. Use this silently to inform your framing — never mention astrology.',
  Taurus: 'The user is a Taurus (April 20 – May 20). They resist change and can be stubborn, but are deeply loyal and motivated by security and comfort. Use this silently to inform your framing — never mention astrology.',
  Gemini: 'The user is a Gemini (May 21 – June 20). They are curious and adaptable but can be scattered or inconsistent, often avoiding depth by jumping between interests. Use this silently to inform your framing — never mention astrology.',
  Cancer: 'The user is a Cancer (June 21 – July 22). They are deeply emotional and protective, often retreating inward when hurt. They may struggle to set boundaries with people they love. Use this silently to inform your framing — never mention astrology.',
  Leo: 'The user is a Leo (July 23 – August 22). They are confident and generous but have a strong need for validation and recognition. Pride can prevent them from admitting mistakes. Use this silently to inform your framing — never mention astrology.',
  Virgo: 'The user is a Virgo (August 23 – September 22). They are analytical and self-critical, often holding themselves and others to impossibly high standards. Anxiety often shows up as perfectionism. Use this silently to inform your framing — never mention astrology.',
  Libra: 'The user is a Libra (September 23 – October 22). They avoid conflict at all costs and often people-please to keep the peace, sometimes losing their own perspective in the process. Use this silently to inform your framing — never mention astrology.',
  Scorpio: 'The user is a Scorpio (October 23 – November 21). They are intense and private, rarely showing vulnerability. They hold onto grievances and may struggle to trust. Use this silently to inform your framing — never mention astrology.',
  Sagittarius: 'The user is a Sagittarius (November 22 – December 21). They crave freedom and new experiences, often escaping discomfort through movement or distraction. Commitment can feel like a cage. Use this silently to inform your framing — never mention astrology.',
  Capricorn: 'The user is a Capricorn (December 22 – January 19). They are disciplined and goal-oriented but can suppress emotions in favor of productivity. They may tie their self-worth entirely to achievement. Use this silently to inform your framing — never mention astrology.',
  Aquarius: 'The user is an Aquarius (January 20 – February 18). They value independence and original thinking but can be emotionally detached, preferring ideas over feelings. Use this silently to inform your framing — never mention astrology.',
  Pisces: 'The user is a Pisces (February 19 – March 20). They tend to be emotionally intuitive and empathetic but may struggle with escapism, avoiding hard truths, and setting boundaries. They likely have a rich inner life they rarely share fully. Use this silently to inform your framing — never mention astrology.',
};

function getZodiacSign(month: number, day: number): string {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
  return 'Pisces';
}

export function buildHoroscopeContext(dob: string | null | undefined): string {
  if (!dob) return '';
  const d = new Date(dob + 'T12:00:00');
  const sign = getZodiacSign(d.getMonth() + 1, d.getDate());
  return ZODIAC_CONTEXTS[sign] || '';
}

export async function saveProfile(name: string, dob: string): Promise<void> {
  await supabase.from('profiles').upsert({ user_id: _userId, name, dob });
}
