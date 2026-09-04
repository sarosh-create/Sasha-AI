CREATE OR REPLACE FUNCTION public.can_use_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN _topic LIKE 'room-sig-%' OR _topic LIKE 'room-data-%' THEN EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.user_id = auth.uid()
        AND rp.room_id::text = regexp_replace(_topic, '^room-(sig|data)-', '')
    )
    WHEN _topic LIKE 'staff%' THEN public.is_staff(auth.uid())
    WHEN _topic LIKE 'profile-stats-%' THEN _topic = 'profile-stats-' || auth.uid()::text
    WHEN _topic LIKE 'channel:%' THEN true
    ELSE false
  END
$$;

DROP POLICY IF EXISTS "Authorised users can read realtime topics" ON realtime.messages;
CREATE POLICY "Authorised users can read realtime topics"
ON realtime.messages FOR SELECT TO authenticated
USING (public.can_use_realtime_topic(realtime.topic()));

DROP POLICY IF EXISTS "Authorised users can send on realtime topics" ON realtime.messages;
CREATE POLICY "Authorised users can send on realtime topics"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (public.can_use_realtime_topic(realtime.topic()));
