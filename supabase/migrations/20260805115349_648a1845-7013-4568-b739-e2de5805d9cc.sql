
-- Staff visibility for admin panel
CREATE POLICY "Staff read all profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff read all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff read teacher applications" ON public.teacher_applications
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff update teacher applications" ON public.teacher_applications
FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
