ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reviewer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'registrar';

ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS actor_user_id uuid;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS actor_email text;

CREATE TABLE IF NOT EXISTS public.staff_profiles (
  user_id uuid PRIMARY KEY,
  full_name text,
  must_change_password boolean NOT NULL DEFAULT true,
  password_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read own profile" ON public.staff_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff update own profile" ON public.staff_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins read all staff profiles" ON public.staff_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER staff_profiles_updated_at BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.staff_profiles (user_id, must_change_password)
SELECT ur.user_id, true FROM public.user_roles ur
ON CONFLICT (user_id) DO NOTHING;