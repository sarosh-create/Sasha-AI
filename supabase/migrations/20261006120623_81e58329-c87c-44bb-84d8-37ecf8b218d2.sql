ALTER TABLE public.visitor_questions
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_by uuid,
  ADD COLUMN IF NOT EXISTS claimed_by uuid;

CREATE INDEX IF NOT EXISTS visitor_questions_visitor_idx ON public.visitor_questions (visitor_id);

GRANT SELECT, UPDATE ON public.visitor_questions TO authenticated;

CREATE POLICY "staff reply to visitor questions"
ON public.visitor_questions FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));