-- 1. Public profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS status_emoji text,
  ADD COLUMN IF NOT EXISTS profile_public boolean NOT NULL DEFAULT true;

-- 2. Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read audit log" ON public.admin_audit_log;
CREATE POLICY "staff read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "staff write audit log" ON public.admin_audit_log;
CREATE POLICY "staff write audit log" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND actor_user_id = auth.uid());
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

-- 3. Role invites (pre-signup)
CREATE TABLE IF NOT EXISTS public.role_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL,
  invited_by uuid,
  claimed_at timestamptz,
  claimed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_invites TO authenticated;
GRANT ALL ON public.role_invites TO service_role;
ALTER TABLE public.role_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff manage role invites" ON public.role_invites;
CREATE POLICY "staff manage role invites" ON public.role_invites
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 4. Apply invites on signup (verified email match only)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));

  IF lower(NEW.email) IN ('msn4sg@gmail.com','tsr4sg@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  SELECT NEW.id, ri.role FROM public.role_invites ri
  WHERE lower(ri.email) = lower(NEW.email) AND ri.claimed_at IS NULL
  ON CONFLICT DO NOTHING;

  UPDATE public.role_invites
    SET claimed_at = now(), claimed_by = NEW.id
    WHERE lower(email) = lower(NEW.email) AND claimed_at IS NULL;

  RETURN NEW;
END;
$function$;

-- 5. Public profile reads for signed-in students
CREATE OR REPLACE FUNCTION public.get_public_profile(_user uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, bio text, status text, status_emoji text, xp integer, level integer, streak_count integer, exam_board text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.display_name, p.avatar_url,
         CASE WHEN p.profile_public THEN p.bio ELSE NULL END,
         CASE WHEN p.profile_public THEN p.status ELSE NULL END,
         CASE WHEN p.profile_public THEN p.status_emoji ELSE NULL END,
         p.xp, p.level, p.streak_count, p.exam_board
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.user_id = _user AND (p.profile_public OR p.user_id = auth.uid())
$function$;

CREATE OR REPLACE FUNCTION public.leaderboard(_metric text)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, status text, status_emoji text, xp integer, lab_xp integer, xp_week integer, streak_count integer, level integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.user_id,
         CASE WHEN p.leaderboard_opt_in THEN COALESCE(p.display_name,'Falcon') ELSE 'Anonymous Falcon' END,
         CASE WHEN p.leaderboard_opt_in THEN p.avatar_url ELSE NULL END,
         CASE WHEN p.leaderboard_opt_in THEN p.status ELSE NULL END,
         CASE WHEN p.leaderboard_opt_in THEN p.status_emoji ELSE NULL END,
         p.xp, p.lab_xp, p.xp_week, p.streak_count, p.level
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
  ORDER BY
    CASE WHEN _metric = 'xp' THEN p.xp
         WHEN _metric = 'lab_xp' THEN p.lab_xp
         WHEN _metric = 'xp_week' THEN p.xp_week
         ELSE p.streak_count END DESC NULLS LAST
  LIMIT 100
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard(text) TO authenticated;