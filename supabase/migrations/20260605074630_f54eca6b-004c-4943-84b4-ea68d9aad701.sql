ALTER TABLE public.explainer_reels
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;