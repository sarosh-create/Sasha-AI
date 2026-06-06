
REVOKE EXECUTE ON FUNCTION public.is_staff_or_teacher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_or_teacher(uuid) TO authenticated, service_role;
