REVOKE SELECT ON public.teachers FROM authenticated;
GRANT SELECT (id, user_id, name, subject, bio, avatar_url, created_at, updated_at) ON public.teachers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;