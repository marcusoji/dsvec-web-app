ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'graduated';

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