CREATE POLICY "room members can read room signalling"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'room-sig-%'
  AND EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.user_id = auth.uid()
      AND rp.room_id::text = replace(realtime.topic(), 'room-sig-', '')
  )
);

CREATE POLICY "room members can send room signalling"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'room-sig-%'
  AND EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.user_id = auth.uid()
      AND rp.room_id::text = replace(realtime.topic(), 'room-sig-', '')
  )
);