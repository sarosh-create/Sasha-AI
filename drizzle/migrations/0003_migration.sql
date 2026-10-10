DROP POLICY IF EXISTS "read messages" ON public.channel_messages;
CREATE POLICY "read messages in existing channels" ON public.channel_messages FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.id = channel_messages.channel_id));

DROP POLICY IF EXISTS "read channels" ON public.chat_channels;
CREATE POLICY "signed-in read channels" ON public.chat_channels FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Everyone reads events" ON public.events;
CREATE POLICY "read current events" ON public.events FOR SELECT TO anon, authenticated
  USING (starts_at > now() - interval '60 days' OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users read teacher directory" ON public.teachers;
CREATE POLICY "signed-in read teacher directory" ON public.teachers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "read past papers" ON public.past_papers;
CREATE POLICY "signed-in read past papers" ON public.past_papers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "read past papers files" ON storage.objects;
CREATE POLICY "read listed past paper files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'past-papers' AND auth.uid() IS NOT NULL AND (
    public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.past_papers p
      WHERE p.pdf_url LIKE '%' || storage.objects.name OR p.marking_scheme_url LIKE '%' || storage.objects.name)));

DROP POLICY IF EXISTS "Everyone reads schemes" ON public.schemes;
CREATE POLICY "signed-in read schemes" ON public.schemes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);