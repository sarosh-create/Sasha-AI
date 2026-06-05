ALTER TABLE public.lesson_path
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS lesson_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS practice_prompt text;