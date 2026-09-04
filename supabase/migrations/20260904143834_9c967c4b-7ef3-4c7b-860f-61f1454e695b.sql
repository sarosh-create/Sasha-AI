REVOKE ALL ON FUNCTION public.can_use_realtime_topic(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_realtime_topic(text) TO supabase_realtime_admin, authenticator;
