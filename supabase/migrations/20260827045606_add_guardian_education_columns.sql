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