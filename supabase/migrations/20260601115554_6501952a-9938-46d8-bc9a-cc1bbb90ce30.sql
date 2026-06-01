
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lab_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_week integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_week_start date,
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS a11y_mode text NOT NULL DEFAULT 'default';

CREATE TABLE IF NOT EXISTS public.explainer_reels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  topic text NOT NULL,
  scenes jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.explainer_reels TO authenticated;
GRANT ALL ON public.explainer_reels TO service_role;

ALTER TABLE public.explainer_reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own reels all"
  ON public.explainer_reels
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_explainer_reels_user ON public.explainer_reels(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON public.profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_lab_xp ON public.profiles(lab_xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_xp_week ON public.profiles(xp_week DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON public.profiles(streak_count DESC);
