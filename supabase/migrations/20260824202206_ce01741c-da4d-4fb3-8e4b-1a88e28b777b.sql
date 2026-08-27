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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
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
('ict','Information & Communication Technology','Computer literacy, networking and practical software skills.','Hands-on training in computer operation, office productivity, networking fundamentals, hardware maintenance and introductory web development. Placeholder description — editable by administrators.','{"Computer operation","Networking basics","Hardware maintenance","Web fundamentals"}','{"IT support technician","Network assistant","Computer operator"}','{"Basic literacy and numeracy","Completed primary/secondary education","Passport photograph"}','12 months','laptop',10),
('catering','Catering & Hospitality','Food preparation, bakery and hospitality service standards.','Practical catering, bakery, food safety and hospitality service training. Placeholder description — editable by administrators.','{"Food preparation","Bakery and confectionery","Food hygiene","Event catering"}','{"Caterer","Baker","Hospitality assistant"}','{"Basic literacy","Health fitness declaration","Passport photograph"}','12 months','chef-hat',20),
('fashion-design','Fashion Design & Garment Making','Pattern drafting, sewing and garment finishing.','Training in measurement, pattern drafting, machine operation, garment construction and finishing. Placeholder description — editable by administrators.','{"Pattern drafting","Machine sewing","Garment finishing","Costing"}','{"Fashion designer","Tailor","Garment workshop owner"}','{"Basic literacy","Passport photograph"}','12 months','scissors',30),
('electrical-installation','Electrical Installation & Maintenance','Domestic and industrial wiring, safety and maintenance.','Practical electrical installation, wiring, fault diagnosis and workplace safety. Placeholder description — editable by administrators.','{"Domestic wiring","Industrial installation","Fault diagnosis","Electrical safety"}','{"Electrician","Maintenance technician","Solar installer"}','{"Basic numeracy","Physical fitness","Passport photograph"}','18 months','plug',40),
('plumbing','Plumbing & Pipe Fitting','Water systems, pipe fitting and sanitary installation.','Training in pipe work, sanitary appliance installation, water systems and maintenance. Placeholder description — editable by administrators.','{"Pipe fitting","Sanitary installation","Leak repair","Water systems"}','{"Plumber","Facility maintenance staff"}','{"Basic literacy","Physical fitness","Passport photograph"}','12 months','wrench',50),
('welding-fabrication','Welding & Fabrication','Arc welding, metal fabrication and workshop safety.','Practical arc and gas welding, metal cutting, fabrication and workshop safety. Placeholder description — editable by administrators.','{"Arc welding","Gas welding","Metal fabrication","Workshop safety"}','{"Welder","Fabricator","Workshop supervisor"}','{"Physical fitness","Passport photograph"}','18 months','flame',60),
('automobile','Automobile Technology','Vehicle systems, servicing and fault diagnosis.','Engine systems, servicing routines, electrical systems and diagnostics. Placeholder description — editable by administrators.','{"Engine servicing","Auto electricals","Fault diagnosis","Preventive maintenance"}','{"Auto mechanic","Service technician","Workshop owner"}','{"Basic literacy","Physical fitness","Passport photograph"}','18 months','car',70),
('carpentry-joinery','Carpentry & Joinery','Woodwork, furniture making and joinery techniques.','Timber selection, joinery, furniture construction and finishing. Placeholder description — editable by administrators.','{"Joinery","Furniture construction","Wood finishing","Measurement"}','{"Carpenter","Furniture maker","Site woodworker"}','{"Basic numeracy","Physical fitness","Passport photograph"}','12 months','hammer',80),
('cosmetology','Cosmetology & Beauty Therapy','Hairdressing, beauty care and salon management.','Hair care, beauty therapy, hygiene standards and salon business skills. Placeholder description — editable by administrators.','{"Hairdressing","Beauty therapy","Salon hygiene","Customer service"}','{"Salon operator","Beauty therapist","Stylist"}','{"Basic literacy","Passport photograph"}','9 months','sparkles',90),
('building-construction','Building & Construction','Blockwork, concreting and finishing trades.','Setting out, blockwork, concreting, plastering and construction safety. Placeholder description — editable by administrators.','{"Blocklaying","Concreting","Plastering","Site safety"}','{"Mason","Site supervisor","Construction contractor"}','{"Physical fitness","Passport photograph"}','18 months','building',100);