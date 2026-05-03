CREATE TABLE IF NOT EXISTS public.streak_revivals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revived_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, revived_date)
);

ALTER TABLE public.streak_revivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own revivals" ON public.streak_revivals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
