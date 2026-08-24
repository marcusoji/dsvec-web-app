REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.next_application_number() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.next_application_number() TO service_role;