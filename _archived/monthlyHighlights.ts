// Archived 2026-05-13: Hook stub exported but never called; JournalScreen uses inline empty array instead.
// TODO: Production version will call a Supabase Edge Function that summarizes
// user entries for the given month via Claude AI. Wire this when Edge Function is ready.

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
