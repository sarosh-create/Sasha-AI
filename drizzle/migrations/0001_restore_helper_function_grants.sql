GRANT EXECUTE ON FUNCTION public.is_my_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_realtime_topic(text) TO authenticated;