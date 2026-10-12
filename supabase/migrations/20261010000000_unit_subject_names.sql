-- ============ per-unit subject names ============
-- Instructors name the subjects their trade unit assesses instead of the
-- scoresheet showing "Subject 1", "Subject 2". `subject_names` holds the labels
-- in order and its length is the number of subjects scored; `subject_count` is
-- kept in step as the authoritative count so older readers keep working.
--
-- When a unit has not been named yet it falls back to `subject_count` unnamed
-- slots (see src/lib/subjects.ts), so nothing breaks before an instructor edits.
--
-- Safe to re-run: every statement is idempotent.
--
-- Fresh databases get the same objects from supabase/export/full-setup.sql.

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS subject_names text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.units.subject_names IS
  'Ordered subject labels an instructor set for the unit. Length is the number of subjects scored; kept in step with subject_count.';
