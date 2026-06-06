DROP POLICY IF EXISTS "Everyone reads live classes" ON public.live_classes;

CREATE POLICY "Authenticated users read live classes"
ON public.live_classes
FOR SELECT
TO authenticated
USING (true);