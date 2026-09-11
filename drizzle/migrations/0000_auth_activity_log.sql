CREATE TABLE IF NOT EXISTS public.auth_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  event text NOT NULL CHECK (event IN ('sign_in','sign_out')),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_activity_created_idx ON public.auth_activity (created_at DESC);

GRANT ALL ON public.auth_activity TO service_role;
GRANT SELECT ON public.auth_activity TO authenticated;

ALTER TABLE public.auth_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read auth activity" ON public.auth_activity;
CREATE POLICY "staff read auth activity"
ON public.auth_activity FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));