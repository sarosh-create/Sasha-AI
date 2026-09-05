-- 1. Internal RLS helper functions must not be callable from the API
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff_or_teacher(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_my_student(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_use_realtime_topic(text) FROM anon, authenticated;

-- 2. Public-facing RPCs: signed-in users only
REVOKE EXECUTE ON FUNCTION public.leaderboard(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM anon;

-- 3. Realtime: channel topics must reference a real channel
CREATE OR REPLACE FUNCTION public.can_use_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN _topic LIKE 'room-sig-%' OR _topic LIKE 'room-data-%' THEN EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.user_id = auth.uid()
        AND rp.room_id::text = regexp_replace(_topic, '^room-(sig|data)-', '')
    )
    WHEN _topic LIKE 'staff%' THEN public.is_staff(auth.uid())
    WHEN _topic LIKE 'profile-stats-%' THEN _topic = 'profile-stats-' || auth.uid()::text
    WHEN _topic LIKE 'channel:%' THEN EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id::text = replace(_topic, 'channel:', '')
    )
    ELSE false
  END
$function$;
REVOKE EXECUTE ON FUNCTION public.can_use_realtime_topic(text) FROM anon, authenticated;

-- 4. Teacher email addresses are staff-only (staff_list_teacher_emails RPC serves admins)
REVOKE SELECT (email) ON public.teachers FROM anon, authenticated;
