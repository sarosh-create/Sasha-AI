REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_my_student(uuid) FROM anon, authenticated, public;