CREATE POLICY "Staff can update past-papers files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'past-papers' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'past-papers' AND public.is_staff(auth.uid()));