ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS staff_profiles_unit_idx ON public.staff_profiles (unit_id);

CREATE OR REPLACE FUNCTION public.staff_unit_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT unit_id FROM public.staff_profiles WHERE user_id = _user_id;
$$;

CREATE TABLE IF NOT EXISTS public.applicant_scores (
  applicant_id uuid PRIMARY KEY REFERENCES public.applicants(id) ON DELETE CASCADE,
  test_score numeric(5, 2) CHECK (test_score >= 0 AND test_score <= 40),
  exam_score numeric(5, 2) CHECK (exam_score >= 0 AND exam_score <= 60),
  recorded_by uuid,
  recorded_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.applicant_scores TO authenticated;
GRANT ALL ON public.applicant_scores TO service_role;
ALTER TABLE public.applicant_scores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_applicant(_user_id uuid, _applicant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (SELECT 1 FROM public.applicants a
           WHERE a.id = _applicant_id AND a.unit_id = public.staff_unit_id(_user_id));
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

CREATE POLICY "staff read admitted applicants in own unit" ON public.applicants
  FOR SELECT TO authenticated USING (
    public.staff_unit_id(auth.uid()) IS NOT NULL
    AND unit_id = public.staff_unit_id(auth.uid())
    AND status = 'admitted');

COMMENT ON TABLE public.applicant_scores IS
  'Assessment scores per admitted applicant (test /40, exam /60).';