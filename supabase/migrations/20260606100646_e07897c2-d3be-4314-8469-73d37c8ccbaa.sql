DROP POLICY IF EXISTS "room msgs select all auth" ON public.room_messages;
DROP POLICY IF EXISTS "room parts select all auth" ON public.room_participants;
ALTER PUBLICATION supabase_realtime DROP TABLE public.staff_messages;