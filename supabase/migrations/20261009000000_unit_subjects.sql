-- ============ per-unit subject count ============
-- A trade unit assesses the subjects it teaches. The 100-point total is split
-- evenly across them (2 subjects → 50/50, 3 → 33/33/34, 4 → 25/25/25/25). The
-- count lives on the unit so every scoresheet for that unit uses the same
-- column layout.
--
-- Safe to re-run: every statement is idempotent.
--
-- Fresh databases get the same objects from supabase/export/full-setup.sql.

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS subject_count smallint NOT NULL DEFAULT 2;

ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_subject_count_check;
ALTER TABLE public.units
  ADD CONSTRAINT units_subject_count_check CHECK (subject_count BETWEEN 2 AND 6);

COMMENT ON COLUMN public.units.subject_count IS
  'Number of subjects the unit assesses; the 100-point total is divided evenly across them.';

-- ============ per-subject marks ============
-- The legacy test_score/exam_score columns stay for older rows and are left
-- untouched. New entry is stored one value per subject in `subjects`; the slot
-- maxima come from the unit's subject_count (see src/lib/subjects.ts), which the
-- server validator enforces on write.
ALTER TABLE public.applicant_scores
  ADD COLUMN IF NOT EXISTS subjects numeric(5, 2)[];

COMMENT ON TABLE public.applicant_scores IS
  'Assessment scores per admitted applicant. Marks are held one value per subject in `subjects`, split evenly across the unit''s subject_count to a 100-point total. The legacy test_score (/40) and exam_score (/60) columns are retained for rows recorded before per-subject entry.';
