ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS grade_level text;

CREATE TABLE IF NOT EXISTS public.teacher_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  subjects text NOT NULL,
  qualifications text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_applications_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT teacher_applications_user_unique UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_applications TO authenticated;
GRANT ALL ON public.teacher_applications TO service_role;

ALTER TABLE public.teacher_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher applicants can view own application" ON public.teacher_applications;
CREATE POLICY "Teacher applicants can view own application"
ON public.teacher_applications
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Teacher applicants can submit own application" ON public.teacher_applications;
CREATE POLICY "Teacher applicants can submit own application"
ON public.teacher_applications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teacher applicants can update own pending application" ON public.teacher_applications;
CREATE POLICY "Teacher applicants can update own pending application"
ON public.teacher_applications
FOR UPDATE
TO authenticated
USING ((user_id = auth.uid() AND status = 'pending') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK ((user_id = auth.uid() AND status = 'pending') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete teacher applications" ON public.teacher_applications;
CREATE POLICY "Admins delete teacher applications"
ON public.teacher_applications
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_teacher_applications_updated ON public.teacher_applications;
CREATE TRIGGER trg_teacher_applications_updated
BEFORE UPDATE ON public.teacher_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();