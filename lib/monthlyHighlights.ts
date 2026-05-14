// TODO: Production version will call a Supabase Edge Function that summarizes
// user entries for the given month via Claude AI. The Edge Function accepts
// { year, month } and returns an array of MonthlyHighlight objects.
// Until then, returns an empty array with no network calls.

export interface MonthlyHighlight {
  insight: string;
  attribution: string;
}

export interface MonthlyHighlightsState {
  highlights: MonthlyHighlight[];
  loading: boolean;
}

export function useMonthlyHighlights(year: number, month: number): MonthlyHighlightsState {
  void year;
  void month;
  return {
    highlights: [],
    loading: false,
  };
}
