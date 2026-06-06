
-- Helper: is the user a teacher OR staff?
CREATE OR REPLACE FUNCTION public.is_staff_or_teacher(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'co_admin'::app_role, 'teacher'::app_role)
  )
$$;

-- Staff chat
CREATE TABLE public.staff_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_messages TO authenticated;
GRANT ALL ON public.staff_messages TO service_role;

ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff reads staff chat" ON public.staff_messages
  FOR SELECT TO authenticated
  USING (public.is_staff_or_teacher(auth.uid()));

CREATE POLICY "staff posts to staff chat" ON public.staff_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_teacher(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "staff deletes own staff message" ON public.staff_messages
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE INDEX idx_staff_messages_created ON public.staff_messages(created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;
