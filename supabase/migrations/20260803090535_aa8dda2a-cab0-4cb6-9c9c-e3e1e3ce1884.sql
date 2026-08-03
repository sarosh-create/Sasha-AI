ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_daily_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_weekly_digest boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_daily_email_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_weekly_email_at timestamptz;