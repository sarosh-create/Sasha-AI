
-- Profile gamification fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS hearts integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS hearts_refill_at timestamptz,
  ADD COLUMN IF NOT EXISTS streak_freezes integer NOT NULL DEFAULT 1;

-- NOTES
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid,
  tag text NOT NULL DEFAULT 'key-idea',
  color text NOT NULL DEFAULT '#a78bfa',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notes all" ON public.notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LESSON PATH
CREATE TABLE public.lesson_path (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid,
  position integer NOT NULL,
  activity text NOT NULL,                -- 'teach' | 'quiz' | 'review'
  title text NOT NULL,
  est_minutes integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'locked', -- 'locked' | 'available' | 'done'
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_path TO authenticated;
GRANT ALL ON public.lesson_path TO service_role;
ALTER TABLE public.lesson_path ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own path all" ON public.lesson_path FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_path_user_pos ON public.lesson_path(user_id, position);

-- ACHIEVEMENTS
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements all" ON public.achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DAILY CHALLENGES
CREATE TABLE public.daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  for_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  code text NOT NULL,        -- 'lessons2' | 'quiz80' | 'study20' | 'note1' | 'tutor10'
  label text NOT NULL,
  target integer NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_challenges TO authenticated;
GRANT ALL ON public.daily_challenges TO service_role;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own challenges all" ON public.daily_challenges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_challenges_user_date ON public.daily_challenges(user_id, for_date);

-- STUDY ROOMS (public to all authenticated users)
CREATE TABLE public.study_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text,
  host_user_id uuid NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  max_participants integer NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_rooms TO authenticated;
GRANT ALL ON public.study_rooms TO service_role;
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms select all auth" ON public.study_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms insert host" ON public.study_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "rooms update host" ON public.study_rooms FOR UPDATE TO authenticated USING (auth.uid() = host_user_id);
CREATE POLICY "rooms delete host" ON public.study_rooms FOR DELETE TO authenticated USING (auth.uid() = host_user_id);

CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_messages TO authenticated;
GRANT ALL ON public.room_messages TO service_role;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room msgs select all auth" ON public.room_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "room msgs insert self" ON public.room_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_room_msgs_room ON public.room_messages(room_id, created_at);

CREATE TABLE public.room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_participants TO authenticated;
GRANT ALL ON public.room_participants TO service_role;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room parts select all auth" ON public.room_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "room parts insert self" ON public.room_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "room parts delete self" ON public.room_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
