CREATE TABLE public.visitor_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  question text NOT NULL,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.visitor_questions TO authenticated;
GRANT ALL ON public.visitor_questions TO service_role;
ALTER TABLE public.visitor_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read visitor questions" ON public.visitor_questions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX visitor_questions_created_idx ON public.visitor_questions (created_at DESC);