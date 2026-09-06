ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS stream text NOT NULL DEFAULT '1';
ALTER TABLE public.applicants DROP CONSTRAINT IF EXISTS applicants_stream_check;
ALTER TABLE public.applicants ADD CONSTRAINT applicants_stream_check CHECK (stream IN ('1','2'));