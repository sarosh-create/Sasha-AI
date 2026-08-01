DROP VIEW IF EXISTS public.teachers_public;

REVOKE SELECT ON public.teachers FROM anon, authenticated;
GRANT SELECT (id, user_id, name, subject, bio, avatar_url, created_at, updated_at) ON public.teachers TO anon, authenticated;

DROP POLICY IF EXISTS "Staff read teachers" ON public.teachers;
CREATE POLICY "Everyone reads teacher directory" ON public.teachers
FOR SELECT USING (true);