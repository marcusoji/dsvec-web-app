-- ============================================================
-- DSTVEB Umutu Branch — full database setup for a self-hosted Supabase project
-- Generated 2026-09-09. Run once in the SQL editor of a fresh project.
-- Order: extensions -> migrations -> storage bucket -> live unit data -> staff admin
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- migration: 20260824202206_ce01741c-da4d-4fb3-8e4b-1a88e28b777b.sql ----------
-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ staff password reset requests ============
-- A staff member who forgot their password asks an administrator to reset it;
-- the open rows surface on the staff screen. Migration
-- 20260907000000_password_reset_requests.sql adds the same objects to existing
-- databases.
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
CREATE POLICY "admins read reset requests" ON public.password_reset_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX password_reset_requests_open_idx
  ON public.password_reset_requests (status, created_at DESC);

-- ============ shared updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ units ============
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  careers text[] NOT NULL DEFAULT '{}',
  requirements text[] NOT NULL DEFAULT '{}',
  duration text,
  image_url text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  subject_count smallint NOT NULL DEFAULT 2,
  subject_names text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_subject_count_check;
ALTER TABLE public.units
  ADD CONSTRAINT units_subject_count_check CHECK (subject_count BETWEEN 2 AND 6);
CREATE INDEX units_active_sort_idx ON public.units (is_active, sort_order);
GRANT SELECT ON public.units TO anon, authenticated;
GRANT INSERT, UPDATE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads active units" ON public.units
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admins read all units" ON public.units
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert units" ON public.units
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update units" ON public.units
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER units_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ application number ============
CREATE SEQUENCE public.application_number_seq START 1;
CREATE OR REPLACE FUNCTION public.next_application_number()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'DSTVEB-UMU-' || to_char(now() AT TIME ZONE 'Africa/Lagos', 'YYYY') || '-'
       || lpad(nextval('public.application_number_seq')::text, 5, '0');
$$;

-- ============ applicants ============
CREATE TYPE public.application_status AS ENUM ('submitted','under_review','shortlisted','admitted','rejected','withdrawn');

CREATE TABLE public.applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number text NOT NULL UNIQUE DEFAULT public.next_application_number(),
  access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  date_of_birth date NOT NULL,
  gender text NOT NULL,
  nationality text NOT NULL DEFAULT 'Nigerian',
  state text NOT NULL,
  local_government text NOT NULL,
  address text NOT NULL,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  status public.application_status NOT NULL DEFAULT 'submitted',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX applicants_email_phone_key
  ON public.applicants (lower(email), regexp_replace(phone, '\D', '', 'g'));
CREATE INDEX applicants_created_idx ON public.applicants (created_at DESC);
CREATE INDEX applicants_unit_idx ON public.applicants (unit_id);
CREATE INDEX applicants_status_idx ON public.applicants (status);
CREATE INDEX applicants_access_token_idx ON public.applicants (access_token);
GRANT SELECT, UPDATE ON public.applicants TO authenticated;
GRANT ALL ON public.applicants TO service_role;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read applicants" ON public.applicants
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update applicants" ON public.applicants
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER applicants_updated_at BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ documents ============
CREATE TYPE public.document_kind AS ENUM ('photograph');

CREATE TABLE public.applicant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  kind public.document_kind NOT NULL DEFAULT 'photograph',
  bucket text NOT NULL DEFAULT 'applicant-photos',
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (applicant_id, kind)
);
CREATE INDEX applicant_documents_applicant_idx ON public.applicant_documents (applicant_id);
GRANT SELECT ON public.applicant_documents TO authenticated;
GRANT ALL ON public.applicant_documents TO service_role;
ALTER TABLE public.applicant_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read documents" ON public.applicant_documents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ activity log ============
CREATE TABLE public.activity_log (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  applicant_id uuid REFERENCES public.applicants(id) ON DELETE SET NULL,
  application_number text,
  email_masked text,
  phone_masked text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_created_idx ON public.activity_log (created_at DESC);
GRANT SELECT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read activity" ON public.activity_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ storage policies ============
CREATE POLICY "admins read applicant photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'applicant-photos' AND public.has_role(auth.uid(), 'admin'));

-- ============ seed units (editable placeholder content) ============
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, icon, sort_order) VALUES
('ict','Information & Communication Technology','Computer literacy, networking and practical software skills.','Hands-on training in computer operation, office productivity, networking fundamentals, hardware maintenance and introductory web development. Placeholder description — editable by administrators.','{"Computer operation","Networking basics","Hardware maintenance","Web fundamentals"}','{"IT support technician","Network assistant","Computer operator"}','{"Basic literacy and numeracy","Completed primary/secondary education","Passport photograph"}','6 months','laptop',10),
('catering','Catering & Hospitality','Food preparation, bakery and hospitality service standards.','Practical catering, bakery, food safety and hospitality service training. Placeholder description — editable by administrators.','{"Food preparation","Bakery and confectionery","Food hygiene","Event catering"}','{"Caterer","Baker","Hospitality assistant"}','{"Basic literacy","Health fitness declaration","Passport photograph"}','6 months','chef-hat',20),
('fashion-design','Fashion Design & Garment Making','Pattern drafting, sewing and garment finishing.','Training in measurement, pattern drafting, machine operation, garment construction and finishing. Placeholder description — editable by administrators.','{"Pattern drafting","Machine sewing","Garment finishing","Costing"}','{"Fashion designer","Tailor","Garment workshop owner"}','{"Basic literacy","Passport photograph"}','6 months','scissors',30),
('electrical-installation','Electrical Installation & Maintenance','Domestic and industrial wiring, safety and maintenance.','Practical electrical installation, wiring, fault diagnosis and workplace safety. Placeholder description — editable by administrators.','{"Domestic wiring","Industrial installation","Fault diagnosis","Electrical safety"}','{"Electrician","Maintenance technician","Solar installer"}','{"Basic numeracy","Physical fitness","Passport photograph"}','6 months','plug',40),
('plumbing','Plumbing & Pipe Fitting','Water systems, pipe fitting and sanitary installation.','Training in pipe work, sanitary appliance installation, water systems and maintenance. Placeholder description — editable by administrators.','{"Pipe fitting","Sanitary installation","Leak repair","Water systems"}','{"Plumber","Facility maintenance staff"}','{"Basic literacy","Physical fitness","Passport photograph"}','6 months','wrench',50),
('welding-fabrication','Welding & Fabrication','Arc welding, metal fabrication and workshop safety.','Practical arc and gas welding, metal cutting, fabrication and workshop safety. Placeholder description — editable by administrators.','{"Arc welding","Gas welding","Metal fabrication","Workshop safety"}','{"Welder","Fabricator","Workshop supervisor"}','{"Physical fitness","Passport photograph"}','6 months','flame',60),
('automobile','Automobile Technology','Vehicle systems, servicing and fault diagnosis.','Engine systems, servicing routines, electrical systems and diagnostics. Placeholder description — editable by administrators.','{"Engine servicing","Auto electricals","Fault diagnosis","Preventive maintenance"}','{"Auto mechanic","Service technician","Workshop owner"}','{"Basic literacy","Physical fitness","Passport photograph"}','6 months','car',70),
('carpentry-joinery','Carpentry & Joinery','Woodwork, furniture making and joinery techniques.','Timber selection, joinery, furniture construction and finishing. Placeholder description — editable by administrators.','{"Joinery","Furniture construction","Wood finishing","Measurement"}','{"Carpenter","Furniture maker","Site woodworker"}','{"Basic numeracy","Physical fitness","Passport photograph"}','6 months','hammer',80),
('cosmetology','Cosmetology & Beauty Therapy','Hairdressing, beauty care and salon management.','Hair care, beauty therapy, hygiene standards and salon business skills. Placeholder description — editable by administrators.','{"Hairdressing","Beauty therapy","Salon hygiene","Customer service"}','{"Salon operator","Beauty therapist","Stylist"}','{"Basic literacy","Passport photograph"}','6 months','sparkles',90),
('building-construction','Building & Construction','Blockwork, concreting and finishing trades.','Setting out, blockwork, concreting, plastering and construction safety. Placeholder description — editable by administrators.','{"Blocklaying","Concreting","Plastering","Site safety"}','{"Mason","Site supervisor","Construction contractor"}','{"Physical fitness","Passport photograph"}','6 months','building',100);

-- ---------- migration: 20260824202219_bdbcab29-b71a-4b46-9d41-75e6b956802b.sql ----------
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.next_application_number() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.next_application_number() TO service_role;

-- ---------- migration: 20260827045606_add_guardian_education_columns.sql ----------
-- Add parent / guardian and educational background details collected on the
-- application form so the printable A4 form can be typed (only signatures are
-- left blank).

ALTER TABLE public.applicants
  ADD COLUMN next_of_kin_name text,
  ADD COLUMN next_of_kin_relationship text,
  ADD COLUMN next_of_kin_phone text,
  ADD COLUMN school text,
  ADD COLUMN qualification text,
  ADD COLUMN school_year text;

COMMENT ON COLUMN public.applicants.next_of_kin_name IS 'Parent / guardian or next of kin full name';
COMMENT ON COLUMN public.applicants.next_of_kin_relationship IS 'Relationship of next of kin to the applicant';
COMMENT ON COLUMN public.applicants.next_of_kin_phone IS 'Next of kin contact phone number';
COMMENT ON COLUMN public.applicants.school IS 'Most recent school / institution attended';
COMMENT ON COLUMN public.applicants.qualification IS 'Highest qualification obtained';
COMMENT ON COLUMN public.applicants.school_year IS 'Year last attended or completed';

-- ---------- migration: 20260828213211_d2e347d4-a819-46c0-8836-5f5e4b60857d.sql ----------
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS next_of_kin_name text,
  ADD COLUMN IF NOT EXISTS next_of_kin_relationship text,
  ADD COLUMN IF NOT EXISTS next_of_kin_phone text,
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS school_year text;

-- ---------- migration: 20260828214633_df2a107f-0c36-41e0-a20a-f7bf8e3ab91e.sql ----------
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

-- ---------- migration: 20260901034037_eb1fbac9-ec13-4cb8-a94c-90e151c7b40a.sql ----------
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS coordinator_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS office_location text;

UPDATE public.units
SET
  coordinator_name = COALESCE(coordinator_name, 'Unit Coordinator, ' || name),
  contact_phone = COALESCE(contact_phone, '+234 800 000 0000'),
  contact_email = COALESCE(contact_email, slug || '@dstveb-umutu.example.ng'),
  office_location = COALESCE(office_location, 'Delta State Vocational Center, Umutu — Workshop Block');

-- ---------- migration: 20260902070903_747727e2-d926-4634-9fdc-5c605b9d1671.sql ----------
UPDATE public.units SET duration = '6 months' WHERE duration IS NOT NULL OR duration IS NULL;

-- ---------- migration: 20260906091217_8168d929-b08e-4242-946d-a1efb3bb2c9d.sql ----------
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS stream text NOT NULL DEFAULT '1';
ALTER TABLE public.applicants DROP CONSTRAINT IF EXISTS applicants_stream_check;
ALTER TABLE public.applicants ADD CONSTRAINT applicants_stream_check CHECK (stream IN ('1','2'));
-- ---------- storage bucket for applicant photographs (private) ----------
INSERT INTO storage.buckets (id, name, public) VALUES ('applicant-photos', 'applicant-photos', false) ON CONFLICT (id) DO NOTHING;

-- Live trade units snapshot (upsert by slug)
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('fashion-design', 'Fashion and Design', 'Pattern drafting, sewing and garment finishing.', 'Training in measurement, pattern drafting, machine operation, garment construction and finishing. Placeholder description — editable by administrators.', ARRAY['Pattern drafting','Machine sewing','Garment finishing','Costing']::text[], ARRAY['Fashion designer','Tailor','Garment workshop owner']::text[], ARRAY['Basic literacy','Passport photograph']::text[], '6 months', NULL, 'scissors', true, 10, 'Unit Coordinator, Fashion Design & Garment Making', '+234 800 000 0000', 'fashion-design@dstveb-umutu.example.ng', 'Delta State Vocational Center, Umutu — Workshop Block')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('hairdressing-makeup', 'Hair Dressing and Makeup', 'Professional hair care, styling, and bridal and studio makeup artistry.', 'Practical salon training covering hair treatment, weaving, braiding, styling, and makeup application for events and photography.', ARRAY['Hair treatment and styling','Weaving and braiding','Bridal and studio makeup','Salon customer care']::text[], ARRAY['Salon stylist','Makeup artist','Salon owner']::text[], ARRAY['Minimum of primary school leaving certificate','Passport photograph','Valid phone number and address']::text[], '6 months', NULL, 'sparkles', true, 20, NULL, NULL, NULL, NULL)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('barbing', 'Barbing', 'Clipper work, fades, shaving and barbershop hygiene and business skills.', 'Hands-on barbering: clipper handling, cuts and fades, beard shaping, sterilisation and running a barbershop.', ARRAY['Clipper handling and fades','Beard shaping and shaving','Sterilisation and hygiene','Shop management']::text[], ARRAY['Barber','Barbershop owner','Grooming specialist']::text[], ARRAY['Minimum of primary school leaving certificate','Passport photograph','Valid phone number and address']::text[], '6 months', NULL, 'scissors', true, 30, NULL, NULL, NULL, NULL)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('electrical', 'Electrical', 'Domestic and industrial wiring, safety and maintenance.', 'Practical electrical installation, wiring, fault diagnosis and workplace safety. Placeholder description — editable by administrators.', ARRAY['Domestic wiring','Industrial installation','Fault diagnosis','Electrical safety']::text[], ARRAY['Electrician','Maintenance technician','Solar installer']::text[], ARRAY['Basic numeracy','Physical fitness','Passport photograph']::text[], '6 months', NULL, 'plug', true, 40, 'Unit Coordinator, Electrical Installation & Maintenance', '+234 800 000 0000', 'electrical-installation@dstveb-umutu.example.ng', 'Delta State Vocational Center, Umutu — Workshop Block')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('catering', 'Catering', 'Food preparation, bakery and hospitality service standards.', 'Practical catering, bakery, food safety and hospitality service training. Placeholder description — editable by administrators.', ARRAY['Food preparation','Bakery and confectionery','Food hygiene','Event catering']::text[], ARRAY['Caterer','Baker','Hospitality assistant']::text[], ARRAY['Basic literacy','Health fitness declaration','Passport photograph']::text[], '6 months', NULL, 'chef-hat', true, 50, 'Unit Coordinator, Catering & Hospitality', '+234 800 000 0000', 'catering@dstveb-umutu.example.ng', 'Delta State Vocational Center, Umutu — Workshop Block')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('welding-fabrication', 'Welding and Fabrication', 'Arc welding, metal fabrication and workshop safety.', 'Practical arc and gas welding, metal cutting, fabrication and workshop safety. Placeholder description — editable by administrators.', ARRAY['Arc welding','Gas welding','Metal fabrication','Workshop safety']::text[], ARRAY['Welder','Fabricator','Workshop supervisor']::text[], ARRAY['Physical fitness','Passport photograph']::text[], '6 months', NULL, 'flame', true, 60, 'Unit Coordinator, Welding & Fabrication', '+234 800 000 0000', 'welding-fabrication@dstveb-umutu.example.ng', 'Delta State Vocational Center, Umutu — Workshop Block')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('automobile', 'Automobile Technology', 'Vehicle systems, servicing and fault diagnosis.', 'Engine systems, servicing routines, electrical systems and diagnostics. Placeholder description — editable by administrators.', ARRAY['Engine servicing','Auto electricals','Fault diagnosis','Preventive maintenance']::text[], ARRAY['Auto mechanic','Service technician','Workshop owner']::text[], ARRAY['Basic literacy','Physical fitness','Passport photograph']::text[], '6 months', NULL, 'car', false, 70, 'Unit Coordinator, Automobile Technology', '+234 800 000 0000', 'automobile@dstveb-umutu.example.ng', 'Delta State Vocational Center, Umutu — Workshop Block')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('general-craft', 'General Craft', 'Multi-skill craft training in wood, fibre, beads and decorative products.', 'A broad craft unit covering handmade products, finishing and small-scale production for the local market.', ARRAY['Craft design and layout','Material selection','Finishing techniques','Product costing']::text[], ARRAY['Craft producer','Artisan entrepreneur','Workshop assistant']::text[], ARRAY['Minimum of primary school leaving certificate','Passport photograph','Valid phone number and address']::text[], '6 months', NULL, 'hammer', true, 70, NULL, NULL, NULL, NULL)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('carpentry-joinery', 'Carpentry & Joinery', 'Woodwork, furniture making and joinery techniques.', 'Timber selection, joinery, furniture construction and finishing. Placeholder description — editable by administrators.', ARRAY['Joinery','Furniture construction','Wood finishing','Measurement']::text[], ARRAY['Carpenter','Furniture maker','Site woodworker']::text[], ARRAY['Basic numeracy','Physical fitness','Passport photograph']::text[], '6 months', NULL, 'hammer', false, 80, 'Unit Coordinator, Carpentry & Joinery', '+234 800 000 0000', 'carpentry-joinery@dstveb-umutu.example.ng', 'Delta State Vocational Center, Umutu — Workshop Block')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('cosmetology', 'Cosmetology', 'Hairdressing, beauty care and salon management.', 'Hair care, beauty therapy, hygiene standards and salon business skills. Placeholder description — editable by administrators.', ARRAY['Hairdressing','Beauty therapy','Salon hygiene','Customer service']::text[], ARRAY['Salon operator','Beauty therapist','Stylist']::text[], ARRAY['Basic literacy','Passport photograph']::text[], '6 months', NULL, 'sparkles', true, 80, 'Unit Coordinator, Cosmetology & Beauty Therapy', '+234 800 000 0000', 'cosmetology@dstveb-umutu.example.ng', 'Delta State Vocational Center, Umutu — Workshop Block')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('ict', 'ICT', 'Computer literacy, networking and practical software skills.', 'Hands-on training in computer operation, office productivity, networking fundamentals, hardware maintenance and introductory web development. Placeholder description — editable by administrators.', ARRAY['Computer operation','Networking basics','Hardware maintenance','Web fundamentals']::text[], ARRAY['IT support technician','Network assistant','Computer operator']::text[], ARRAY['Basic literacy and numeracy','Completed primary/secondary education','Passport photograph']::text[], '6 months', NULL, 'laptop', true, 90, 'Unit Coordinator, Information & Communication Technology', '+234 800 000 0000', 'ict@dstveb-umutu.example.ng', 'Delta State Vocational Center, Umutu — Workshop Block')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('computer-engineering', 'Computer Engineering', 'Computer hardware maintenance, repairs, networking and systems support.', 'Trainees diagnose and repair desktops and laptops, install operating systems and set up small office networks.', ARRAY['Hardware diagnosis and repair','Operating system installation','Networking basics','Preventive maintenance']::text[], ARRAY['Computer technician','IT support officer','Repair shop owner']::text[], ARRAY['Basic literacy and numeracy','Passport photograph','Valid phone number and address']::text[], '6 months', NULL, 'cpu', true, 100, NULL, NULL, NULL, NULL)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('event-management-decoration', 'Event Management and Decoration', 'Event planning, draping, floral work and venue decoration.', 'From client briefing to venue setup: budgeting, drapery, table settings, floral arrangement and event-day coordination.', ARRAY['Event planning and budgeting','Draping and floral design','Table and stage setting','Vendor coordination']::text[], ARRAY['Event planner','Decorator','Rental business owner']::text[], ARRAY['Minimum of primary school leaving certificate','Passport photograph','Valid phone number and address']::text[], '6 months', NULL, 'party-popper', true, 110, NULL, NULL, NULL, NULL)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('building', 'Building (Tiling / Interlocking / POP)', 'Blockwork, concreting and finishing trades.', 'Setting out, blockwork, concreting, plastering and construction safety. Placeholder description — editable by administrators.', ARRAY['Blocklaying','Concreting','Plastering','Site safety']::text[], ARRAY['Mason','Site supervisor','Construction contractor']::text[], ARRAY['Physical fitness','Passport photograph']::text[], '6 months', NULL, 'building', true, 120, 'Unit Coordinator, Building & Construction', '+234 800 000 0000', 'building-construction@dstveb-umutu.example.ng', 'Delta State Vocational Center, Umutu — Workshop Block')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('plumbing', 'Plumbing', 'Water systems, pipe fitting and sanitary installation.', 'Training in pipe work, sanitary appliance installation, water systems and maintenance. Placeholder description — editable by administrators.', ARRAY['Pipe fitting','Sanitary installation','Leak repair','Water systems']::text[], ARRAY['Plumber','Facility maintenance staff']::text[], ARRAY['Basic literacy','Physical fitness','Passport photograph']::text[], '6 months', NULL, 'wrench', true, 130, 'Unit Coordinator, Plumbing & Pipe Fitting', '+234 800 000 0000', 'plumbing@dstveb-umutu.example.ng', 'Delta State Vocational Center, Umutu — Workshop Block')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('refrigeration', 'Refrigeration', 'Refrigeration and air-conditioning installation, servicing and repair.', 'Practical training in refrigeration cycles, gas charging, fault diagnosis and servicing of fridges and air conditioners.', ARRAY['Refrigeration cycle and components','Gas charging and leak testing','Fault diagnosis','AC installation and servicing']::text[], ARRAY['Refrigeration technician','AC installer','Service workshop owner']::text[], ARRAY['Minimum of primary school leaving certificate','Passport photograph','Valid phone number and address']::text[], '6 months', NULL, 'snowflake', true, 140, NULL, NULL, NULL, NULL)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;
INSERT INTO public.units (slug, name, summary, description, skills, careers, requirements, duration, image_url, icon, is_active, sort_order, coordinator_name, contact_phone, contact_email, office_location) VALUES ('bag-making', 'Bag Making', 'Design and production of leather, fabric and school bags.', 'Trainees cut, assemble and finish bags of different styles, and learn pricing and market presentation.', ARRAY['Pattern cutting for bags','Assembly and stitching','Lining and finishing','Pricing and marketing']::text[], ARRAY['Bag maker','Leather goods entrepreneur','Production assistant']::text[], ARRAY['Minimum of primary school leaving certificate','Passport photograph','Valid phone number and address']::text[], '6 months', NULL, 'briefcase', true, 150, NULL, NULL, NULL, NULL)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, skills = EXCLUDED.skills, careers = EXCLUDED.careers, requirements = EXCLUDED.requirements, duration = EXCLUDED.duration, image_url = EXCLUDED.image_url, icon = EXCLUDED.icon, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, coordinator_name = EXCLUDED.coordinator_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, office_location = EXCLUDED.office_location;

-- ---------- seeded staff admin ----------
-- Email: dsvecumutu@gmail.com   Password: Admin@umutudsvec27
-- Change the password after first sign-in via /admin/account.
DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'dsvecumutu@gmail.com';
  IF uid IS NULL THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'dsvecumutu@gmail.com', crypt('Admin@umutudsvec27', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, uid::text, 'email',
      jsonb_build_object('sub', uid::text, 'email', 'dsvecumutu@gmail.com', 'email_verified', true), now(), now(), now());
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.staff_profiles (user_id, full_name, must_change_password)
    VALUES (uid, 'Umutu Centre Admin', false) ON CONFLICT (user_id) DO NOTHING;
END $$;

-- ---------- migration: 20260918120000_staff_departments_and_scores.sql ----------
-- ============ staff department assignment ============
-- A staff account may be tied to a trade unit. Members without an assignment
-- see nothing (least privilege); administrators bypass the scope entirely.
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS staff_profiles_unit_idx ON public.staff_profiles (unit_id);

CREATE OR REPLACE FUNCTION public.staff_unit_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT unit_id FROM public.staff_profiles WHERE user_id = _user_id;
$$;

-- ============ scores ============
-- One assessment row per applicant. Marks are held one value per subject in
-- `subjects`, split evenly across the unit's subject_count to a 100-point total
-- (2 subjects → 50/50, 3 → 33/33/34, 4 → 25/25/25/25). The legacy test_score
-- (/40) and exam_score (/60) columns are retained for rows recorded before
-- per-subject entry.
CREATE TABLE IF NOT EXISTS public.applicant_scores (
  applicant_id uuid PRIMARY KEY REFERENCES public.applicants(id) ON DELETE CASCADE,
  test_score numeric(5, 2) CHECK (test_score >= 0 AND test_score <= 40),
  exam_score numeric(5, 2) CHECK (exam_score >= 0 AND exam_score <= 60),
  subjects numeric(5, 2)[],
  recorded_by uuid,
  recorded_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.applicant_scores TO authenticated;
GRANT ALL ON public.applicant_scores TO service_role;

ALTER TABLE public.applicant_scores ENABLE ROW LEVEL SECURITY;

-- Department scoping: staff reach only applicants admitted into their own unit.
CREATE OR REPLACE FUNCTION public.can_access_applicant(_user_id uuid, _applicant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (
           SELECT 1 FROM public.applicants a
           WHERE a.id = _applicant_id
             AND a.unit_id = public.staff_unit_id(_user_id)
         );
$$;

CREATE POLICY "staff read scores in own unit" ON public.applicant_scores
  FOR SELECT TO authenticated USING (public.can_access_applicant(auth.uid(), applicant_id));
CREATE POLICY "staff write scores in own unit" ON public.applicant_scores
  FOR INSERT TO authenticated WITH CHECK (public.can_access_applicant(auth.uid(), applicant_id));
CREATE POLICY "staff update scores in own unit" ON public.applicant_scores
  FOR UPDATE TO authenticated USING (public.can_access_applicant(auth.uid(), applicant_id))
  WITH CHECK (public.can_access_applicant(auth.uid(), applicant_id));

CREATE TRIGGER applicant_scores_updated_at BEFORE UPDATE ON public.applicant_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Staff may read admitted applicants of their own unit straight from the table.
CREATE POLICY "staff read admitted applicants in own unit" ON public.applicants
  FOR SELECT TO authenticated USING (
    public.staff_unit_id(auth.uid()) IS NOT NULL
    AND unit_id = public.staff_unit_id(auth.uid())
    AND status = 'admitted'
  );

-- Graduated status and free-plan storage usage check
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'graduated';

CREATE OR REPLACE FUNCTION public.storage_usage()
RETURNS TABLE(db_bytes bigint, bucket_bytes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, storage
AS $$
  SELECT pg_database_size(current_database())::bigint,
         COALESCE((SELECT sum((metadata->>'size')::bigint) FROM storage.objects), 0)::bigint;
$$;
REVOKE ALL ON FUNCTION public.storage_usage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_usage() TO service_role;

-- ============ school news / announcements ============
-- The public Umutu page shows the four most recent posts. Adding a fifth drops
-- the oldest unpinned post (and its media); pinned posts keep their place.
CREATE TABLE public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  is_draft boolean NOT NULL DEFAULT false,
  author_email text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX news_posts_draft_pinned_created_idx
  ON public.news_posts (is_draft, pinned DESC, created_at DESC);
GRANT SELECT ON public.news_posts TO anon, authenticated;
GRANT ALL ON public.news_posts TO service_role;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads news" ON public.news_posts
  FOR SELECT TO anon, authenticated USING (is_draft = false);
CREATE TRIGGER news_posts_updated_at BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TYPE public.news_attachment_kind AS ENUM ('image', 'document');

CREATE TABLE public.news_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.news_posts(id) ON DELETE CASCADE,
  kind public.news_attachment_kind NOT NULL,
  bucket text NOT NULL DEFAULT 'news-media',
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX news_attachments_post_idx ON public.news_attachments (post_id);
GRANT SELECT ON public.news_attachments TO anon, authenticated;
GRANT ALL ON public.news_attachments TO service_role;
ALTER TABLE public.news_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads news attachments" ON public.news_attachments
  FOR SELECT TO anon, authenticated USING (true);

-- ---------- storage bucket for news media (private) ----------
INSERT INTO storage.buckets (id, name, public) VALUES ('news-media', 'news-media', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "admins read news media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'news-media' AND public.has_role(auth.uid(), 'admin'));
