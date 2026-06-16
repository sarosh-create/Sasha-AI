DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;

CREATE POLICY "Authenticated users submit own feedback"
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (email IS NULL OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
);

CREATE POLICY "Anonymous users submit feedback without contact info"
ON public.feedback
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND email IS NULL
  AND display_name IS NULL
);