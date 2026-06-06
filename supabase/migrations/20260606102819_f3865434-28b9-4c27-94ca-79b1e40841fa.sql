-- 1) Restrictive policies on user_roles
CREATE POLICY "Only admins may insert roles (restrictive)"
ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins may update roles (restrictive)"
ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins may delete roles (restrictive)"
ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Owner-scoped policies for the private 'sasha' bucket (path: <auth.uid()>/...)
CREATE POLICY "Users read own sasha files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sasha' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own sasha files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sasha' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own sasha files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'sasha' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'sasha' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own sasha files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sasha' AND auth.uid()::text = (storage.foldername(name))[1]);