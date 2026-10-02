-- Adds the "graduated" status and the free-plan storage usage helper to
-- databases that were created before the graduation / clean-up feature.
-- Safe to re-run: every statement is idempotent.
--
-- Fresh databases get the same objects from supabase/export/full-setup.sql.

-- Graduated students leave the class roster but stay in their own section until
-- the storage clean-up removes them.
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'graduated';

-- Reports the database size and total Storage bucket usage so the portal can
-- warn before the Supabase free plan (350 MB database / 700 MB storage) fills.
CREATE OR REPLACE FUNCTION public.storage_usage()
RETURNS TABLE(db_bytes bigint, bucket_bytes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT pg_database_size(current_database())::bigint,
         COALESCE((SELECT sum((metadata->>'size')::bigint) FROM storage.objects), 0)::bigint;
$$;

REVOKE ALL ON FUNCTION public.storage_usage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_usage() TO service_role;
