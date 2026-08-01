DROP POLICY IF EXISTS "Everyone reads teachers" ON public.teachers;

CREATE POLICY "Staff read teachers" ON public.teachers
FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

REVOKE SELECT ON public.teachers FROM anon;

CREATE OR REPLACE VIEW public.teachers_public
WITH (security_invoker = off) AS
SELECT id, name, subject, bio, avatar_url, created_at
FROM public.teachers;

GRANT SELECT ON public.teachers_public TO anon, authenticated;