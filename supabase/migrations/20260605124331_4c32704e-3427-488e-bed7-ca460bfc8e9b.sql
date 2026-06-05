-- lesson_content
CREATE TABLE public.lesson_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name text NOT NULL,
  topic text NOT NULL,
  grade_level text,
  exam_board text,
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  worked_example text,
  quiz jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lesson_content_lookup ON public.lesson_content(subject_name, topic, grade_level, exam_board, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_content TO authenticated;
GRANT ALL ON public.lesson_content TO service_role;
ALTER TABLE public.lesson_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published lessons" ON public.lesson_content FOR SELECT TO authenticated USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage lessons" ON public.lesson_content FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER lesson_content_updated BEFORE UPDATE ON public.lesson_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lesson_path ADD COLUMN IF NOT EXISTS lesson_content_id uuid REFERENCES public.lesson_content(id) ON DELETE SET NULL;
ALTER TABLE public.lesson_path ADD COLUMN IF NOT EXISTS topic text;

-- is_staff helper
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin'::app_role, 'co_admin'::app_role))
$$;

-- teacher_students
CREATE TABLE public.teacher_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_user_id uuid NOT NULL,
  student_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_user_id, student_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_students TO authenticated;
GRANT ALL ON public.teacher_students TO service_role;
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher reads own links" ON public.teacher_students FOR SELECT TO authenticated USING (teacher_user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "staff manages teacher links" ON public.teacher_students FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.is_my_student(_student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teacher_students WHERE teacher_user_id = auth.uid() AND student_user_id = _student)
$$;

CREATE POLICY "teacher reads linked profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_my_student(user_id));
CREATE POLICY "teacher reads linked subjects" ON public.subjects FOR SELECT TO authenticated USING (public.is_my_student(user_id));
CREATE POLICY "teacher reads linked quizzes" ON public.quizzes FOR SELECT TO authenticated USING (public.is_my_student(user_id));
CREATE POLICY "teacher reads linked lesson_path" ON public.lesson_path FOR SELECT TO authenticated USING (public.is_my_student(user_id));

-- lock writes on events/schemes/live_classes/teachers to staff
DROP POLICY IF EXISTS "admins manage events" ON public.events;
DROP POLICY IF EXISTS "admins manage schemes" ON public.schemes;
DROP POLICY IF EXISTS "admins manage live_classes" ON public.live_classes;
DROP POLICY IF EXISTS "admins manage teachers" ON public.teachers;
CREATE POLICY "staff manage events" ON public.events FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff manage schemes" ON public.schemes FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff manage live_classes" ON public.live_classes FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff manage teachers" ON public.teachers FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- past_papers
CREATE TABLE public.past_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  exam_board text,
  level text,
  subject text,
  year int,
  paper_type text,
  pdf_url text NOT NULL,
  marking_scheme_url text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.past_papers TO authenticated;
GRANT ALL ON public.past_papers TO service_role;
ALTER TABLE public.past_papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read past papers" ON public.past_papers FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manages past papers" ON public.past_papers FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- chat channels
CREATE TABLE public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  subject text,
  exam_board text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_channels TO authenticated;
GRANT ALL ON public.chat_channels TO service_role;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read channels" ON public.chat_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manages channels" ON public.chat_channels FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  parent_id uuid REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_channel_messages_channel ON public.channel_messages(channel_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_messages TO authenticated;
GRANT ALL ON public.channel_messages TO service_role;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read messages" ON public.channel_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "post messages" ON public.channel_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "edit own message" ON public.channel_messages FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "delete own or staff" ON public.channel_messages FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.channel_message_ratings (
  message_id uuid NOT NULL REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_message_ratings TO authenticated;
GRANT ALL ON public.channel_message_ratings TO service_role;
ALTER TABLE public.channel_message_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read ratings" ON public.channel_message_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "own rating insert" ON public.channel_message_ratings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own rating delete" ON public.channel_message_ratings FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;