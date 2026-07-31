
-- STUDY ROOMS: only public rooms, host, or participants
DROP POLICY IF EXISTS "rooms select all auth" ON public.study_rooms;
CREATE POLICY "rooms select public or member" ON public.study_rooms
FOR SELECT TO authenticated
USING (
  is_public = true
  OR host_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.room_participants rp WHERE rp.room_id = study_rooms.id AND rp.user_id = auth.uid())
);

-- LIVE CLASSES: rows with URLs only for staff or signed-up students
DROP POLICY IF EXISTS "Authenticated users read live classes" ON public.live_classes;
CREATE POLICY "live classes read for enrolled or staff" ON public.live_classes
FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.class_signups cs WHERE cs.class_id = live_classes.id AND cs.user_id = auth.uid())
);

-- Public schedule listing without leaking meeting/video URLs
CREATE OR REPLACE FUNCTION public.list_live_classes()
RETURNS TABLE (
  id uuid, title text, description text, subject text,
  scheduled_at timestamptz, duration_minutes integer, capacity integer,
  teacher_id uuid, teacher_name text, teacher_subject text,
  meeting_url text, video_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lc.id, lc.title, lc.description, lc.subject,
         lc.scheduled_at, lc.duration_minutes, lc.capacity,
         lc.teacher_id, t.name, t.subject,
         CASE WHEN public.is_staff(auth.uid())
                OR EXISTS (SELECT 1 FROM public.class_signups cs WHERE cs.class_id = lc.id AND cs.user_id = auth.uid())
              THEN lc.meeting_url ELSE NULL END,
         CASE WHEN public.is_staff(auth.uid())
                OR EXISTS (SELECT 1 FROM public.class_signups cs WHERE cs.class_id = lc.id AND cs.user_id = auth.uid())
              THEN lc.video_url ELSE NULL END
  FROM public.live_classes lc
  LEFT JOIN public.teachers t ON t.id = lc.teacher_id
  WHERE auth.uid() IS NOT NULL
  ORDER BY lc.scheduled_at ASC
$$;
REVOKE ALL ON FUNCTION public.list_live_classes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_live_classes() TO authenticated;

-- MESSAGE RATINGS: no cross-user visibility; counts via function
DROP POLICY IF EXISTS "read ratings" ON public.channel_message_ratings;
CREATE POLICY "read own ratings" ON public.channel_message_ratings
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.channel_message_rating_counts(_message_ids uuid[])
RETURNS TABLE (message_id uuid, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.message_id, count(*)::bigint
  FROM public.channel_message_ratings r
  WHERE auth.uid() IS NOT NULL AND r.message_id = ANY(_message_ids)
  GROUP BY r.message_id
$$;
REVOKE ALL ON FUNCTION public.channel_message_rating_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.channel_message_rating_counts(uuid[]) TO authenticated;
