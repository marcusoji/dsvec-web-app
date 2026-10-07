-- School news / announcements posted by an administrator.
--
-- The public Umutu page shows the four most recent posts. When a fifth is
-- added the oldest *unpinned* post is dropped so the page never grows past
-- four; pinned posts are never auto-removed, instead the oldest unpinned post
-- is dropped to make room. This keeps the free plan's storage in check without
-- needing a scheduled job.
--
-- Safe to re-run: every statement is idempotent.
--
-- Fresh databases get the same objects from supabase/export/full-setup.sql.

-- ============ news posts ============
CREATE TABLE IF NOT EXISTS public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  author_email text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_posts_pinned_created_idx
  ON public.news_posts (pinned DESC, created_at DESC);

GRANT SELECT ON public.news_posts TO anon, authenticated;
GRANT ALL ON public.news_posts TO service_role;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public reads news" ON public.news_posts;
CREATE POLICY "public reads news" ON public.news_posts
  FOR SELECT TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS news_posts_updated_at ON public.news_posts;
CREATE TRIGGER news_posts_updated_at BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ news attachments ============
-- An image is shown inline; a document can be previewed in the browser and
-- downloaded. Both live in the private `news-media` bucket and are handed out
-- as short-lived signed URLs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'news_attachment_kind') THEN
    CREATE TYPE public.news_attachment_kind AS ENUM ('image', 'document');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.news_attachments (
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
CREATE INDEX IF NOT EXISTS news_attachments_post_idx
  ON public.news_attachments (post_id);

GRANT SELECT ON public.news_attachments TO anon, authenticated;
GRANT ALL ON public.news_attachments TO service_role;
ALTER TABLE public.news_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public reads news attachments" ON public.news_attachments;
CREATE POLICY "public reads news attachments" ON public.news_attachments
  FOR SELECT TO anon, authenticated USING (true);

-- ============ storage bucket for news media (private) ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-media', 'news-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "admins read news media" ON storage.objects;
CREATE POLICY "admins read news media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'news-media' AND public.has_role(auth.uid(), 'admin'));
