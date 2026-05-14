// Types
export interface DailyFeature {
  date: string;
  title: string;
  quote: string;
  imageUrl: string;
}

export interface DailyFeatureState {
  feature: DailyFeature;
  loading: boolean;
}

// Rotating editorial hero images (Unsplash)
const HERO_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', // mountain morning light
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', // forest fog path
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80', // night mountain stars
  'https://images.unsplash.com/photo-1445375011782-2384686778a0?w=800&q=80', // calm lake reflection
  'https://images.unsplash.com/photo-1476673160081-cf065607f449?w=800&q=80', // warm light window
];

// Rotate by day-of-year so the image changes daily
const dayIndex =
  Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  ) % HERO_IMAGES.length;

export const dailyHeroImageUrl: string = HERO_IMAGES[dayIndex];

// Fallback data
const FALLBACK_FEATURE: DailyFeature = {
  date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  title: "Today's Reflection",
  quote: "What part of you are you leaving unexplored?",
  imageUrl: HERO_IMAGES[dayIndex],
};

// TODO: Production version will fetch from letsunpack.app/daily-features.json,
// indexed by today's date (YYYY-MM-DD). The response shape matches DailyFeature.
// Until then, returns hardcoded fallback data with no network calls.
export function useDailyFeature(): DailyFeatureState {
  return {
    feature: FALLBACK_FEATURE,
    loading: false,
  };
}
