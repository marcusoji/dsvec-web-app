-- Staff forgot-password requests.
--
-- A staff member who cannot sign in asks an administrator to reset their
-- password (see requestPasswordReset in src/lib/password-reset.functions.ts).
-- The request lands here and the staff screen lists the open rows so an
-- administrator can set a temporary password and mark the request resolved.
--
-- This table was previously only present in the Drizzle directory
-- (drizzle/migrations/0001_password_reset_requests.sql), which Supabase does
-- not apply; without this migration the staff flow fails at runtime. Fresh
-- databases get the same objects from supabase/export/full-setup.sql.

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

GRANT SELECT ON public.password_reset_requests TO authenticated;
GRANT ALL ON public.password_reset_requests TO service_role;

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read reset requests" ON public.password_reset_requests;
CREATE POLICY "admins read reset requests" ON public.password_reset_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS password_reset_requests_open_idx
  ON public.password_reset_requests (status, created_at DESC);
