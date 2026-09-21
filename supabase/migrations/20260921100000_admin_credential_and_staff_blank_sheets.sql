-- ============ administrator credential ============
-- Rotates the seeded centre administrator onto the agreed credential. The seed
-- in full-setup.sql still runs first for a fresh database; this migration keeps
-- existing deployments on the same password, so the documented login is the
-- truth for every environment. Change it from /admin/account after first use.
--
-- `crypt`/`gen_salt` come from pgcrypto, which Supabase installs in the
-- `extensions` schema; fall back to `public` for stock Postgres.
DO $$
DECLARE
  uid uuid;
  target_email text := 'dsvecumutu@gmail.com';
  target_password text := 'Admin@umutudsvec27';
  digest text;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = target_email;
  IF uid IS NULL THEN
    RAISE NOTICE 'Admin % not present; skipping password rotation', target_email;
    RETURN;
  END IF;

  BEGIN
    digest := extensions.crypt(target_password, extensions.gen_salt('bf'));
  EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
    digest := crypt(target_password, gen_salt('bf'));
  END;

  UPDATE auth.users
     SET encrypted_password = digest,
         updated_at = now()
   WHERE id = uid;

  -- `must_change_password` is deliberately left alone: the branch asked for a
  -- fixed administrator credential, so this is not treated as a throwaway
  -- first-login secret. Change it from /admin/account at any time.
END $$;

-- ============ staff overview windows ============
-- Department staff do not change statuses, so the Applicants pages are closed
-- to them. They keep a read-only view of the students in their own trade unit
-- together with the two official printouts the branch issues from it:
--
--   * a contact list — name, application number, phone number;
--   * a scoresheet — name, application number, and blank C.A. / examination
--     boxes for the assessor to complete by hand.
--
-- Both are rendered client-side from `listStudents`, which already filters by
-- `status = 'admitted'` and the caller's resolved `staff_profiles.unit_id`.
-- No new tables are required; the score-entry columns already exist on
-- public.applicant_scores.
COMMENT ON TABLE public.applicant_scores IS
  'Assessment scores per admitted applicant (test /40, exam /60). Staff print a blank sheet and enter marks in the portal; the printable sheet leaves the C.A. and examination cells empty for handwritten entry.';
