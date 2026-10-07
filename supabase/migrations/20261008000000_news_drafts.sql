-- Draft support for school news.
--
-- A posted item can be saved as a draft: it is kept (and can be edited with the
-- same form) but never shown on the public Umutu page and never counted by the
-- rolling-four prune. This lets an administrator save work in progress — the
-- client also keeps a local copy so a dropped network does not lose the text.
--
-- Safe to re-run: every statement is idempotent.
--
-- Fresh databases get the same objects from supabase/export/full-setup.sql.

ALTER TABLE public.news_posts
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

-- Drafts must never be readable by the public, so tighten the existing policy
-- (re-runnable: drop then create).
DROP POLICY IF EXISTS "public reads news" ON public.news_posts;
CREATE POLICY "public reads news" ON public.news_posts
  FOR SELECT TO anon, authenticated USING (is_draft = false);

CREATE INDEX IF NOT EXISTS news_posts_draft_pinned_created_idx
  ON public.news_posts (is_draft, pinned DESC, created_at DESC);
