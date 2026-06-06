-- Learning DNA
CREATE TABLE public.learning_dna (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_style TEXT,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  attention_minutes INT NOT NULL DEFAULT 25,
  retention_score INT NOT NULL DEFAULT 50,
  summary TEXT,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_dna TO authenticated;
GRANT ALL ON public.learning_dna TO service_role;
ALTER TABLE public.learning_dna ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dna" ON public.learning_dna FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mistake Journal
CREATE TABLE public.mistake_journal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  student_answer TEXT,
  correct_answer TEXT,
  why_wrong TEXT,
  marks_lost INT NOT NULL DEFAULT 1,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mistake_journal_user_idx ON public.mistake_journal(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mistake_journal TO authenticated;
GRANT ALL ON public.mistake_journal TO service_role;
ALTER TABLE public.mistake_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mistakes" ON public.mistake_journal FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Exam Predictions
CREATE TABLE public.exam_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  probability INT NOT NULL DEFAULT 50,
  reasoning TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exam_predictions_user_idx ON public.exam_predictions(user_id, subject_id, probability DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_predictions TO authenticated;
GRANT ALL ON public.exam_predictions TO service_role;
ALTER TABLE public.exam_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own predictions" ON public.exam_predictions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rival State
CREATE TABLE public.rival_state (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Echo',
  level INT NOT NULL DEFAULT 1,
  last_score INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  last_taunt TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rival_state TO authenticated;
GRANT ALL ON public.rival_state TO service_role;
ALTER TABLE public.rival_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rival" ON public.rival_state FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Generated Artifacts (Universal Content Converter outputs)
CREATE TABLE public.generated_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_title TEXT,
  source_kind TEXT NOT NULL DEFAULT 'text',
  artifact_kind TEXT NOT NULL,
  title TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX generated_artifacts_user_idx ON public.generated_artifacts(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_artifacts TO authenticated;
GRANT ALL ON public.generated_artifacts TO service_role;
ALTER TABLE public.generated_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own artifacts" ON public.generated_artifacts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Teacher Sessions (multi-persona AI teacher chats)
CREATE TABLE public.teacher_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona TEXT NOT NULL,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX teacher_sessions_user_idx ON public.teacher_sessions(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_sessions TO authenticated;
GRANT ALL ON public.teacher_sessions TO service_role;
ALTER TABLE public.teacher_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own teacher sessions" ON public.teacher_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated-at triggers
CREATE TRIGGER learning_dna_updated_at BEFORE UPDATE ON public.learning_dna
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER rival_state_updated_at BEFORE UPDATE ON public.rival_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER teacher_sessions_updated_at BEFORE UPDATE ON public.teacher_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();