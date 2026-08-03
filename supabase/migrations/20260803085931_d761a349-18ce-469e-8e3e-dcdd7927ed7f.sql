-- Restrict teacher directory reads to authenticated users
DROP POLICY IF EXISTS "Everyone reads teacher directory" ON public.teachers;
CREATE POLICY "Authenticated users read teacher directory"
ON public.teachers FOR SELECT TO authenticated USING (true);

-- Remove table-wide select; grant column-level select excluding email
REVOKE SELECT ON public.teachers FROM anon, authenticated;
GRANT SELECT (id, user_id, name, subject, bio, avatar_url, created_at, updated_at)
  ON public.teachers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;

-- Staff-only access to teacher emails
CREATE OR REPLACE FUNCTION public.staff_list_teacher_emails()
RETURNS TABLE(id uuid, name text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.id, t.name, t.email
  FROM public.teachers t
  WHERE public.is_staff(auth.uid())
$$;

REVOKE ALL ON FUNCTION public.staff_list_teacher_emails() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_list_teacher_emails() TO authenticated;