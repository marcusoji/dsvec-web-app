<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Staff accounts, department scoping and scores

- Roles live in `src/lib/permissions.ts` (`ROLES`, `ROLE_PERMISSIONS`). Adding a
  role means extending the `app_role` enum in the DB and adding an entry here.
- `UNIT_SCOPED_ROLES` (currently `staff` only) marks roles whose access is
  limited to one trade unit. `requiresUnit(role)` gates the department picker
  in the UI and the server-side validation; both must stay in sync.
- Department scope is resolved server-side from `staff_profiles.unit_id` in the
  `requireAdmin` middleware — never trust a client-supplied unit. The resolved
  value is exposed as `admin.unitId`. `null` means an admin (unscoped) or an
  unassigned account, which `scopedUnitId()` in `src/lib/school.functions.ts`
  treats as "no access" for department-scoped callers.
- Scores are stored one row per applicant in `public.applicant_scores`
  (test out of 40, exam out of 60; total is a 100-point grade). Constraints are
  enforced both in the DB (`CHECK`) and in `saveScores` zod validation.
- Staff only ever see admitted applicants in their own unit. This is enforced
  twice: `listStudents`/`getStudent`/`saveScores` filter by `status='admitted'`
  server-side, and RLS policies (`can_access_applicant`) back it up.
- Print output uses the `no-print` / `print-only` utility classes in
  `src/styles.css`. The portal header and footer are `no-print`; routes that
  print set `data-hide-badge` on `<html>` so the editor badge stays out of PDFs.
- `src/routes/_authenticated/admin/students/$id/scoresheet.tsx` renders an A4
  sheet via `.print-sheet`; "Print / Save as PDF" is just `window.print()`.
- The staff roster issues two official printouts, both built in
  `src/components/site/student-print-sheets.tsx` from the `listStudents` rows:
  a contact list (name, application number, phone) tagged `data-sheet="contact"`
  and a scoresheet (name, application number, blank C.A./exam boxes) tagged
  `data-sheet="scores"`. `printSheet()` in `src/lib/print-sheets.ts` sets
  `<html data-print="…">`, which the print CSS uses to hide the other sheet;
  the wrapper is `print-only hidden` because a bare `print-only` rule wins over
  Tailwind's `hidden`. Keep both sheets in the DOM so `window.print()` is
  synchronous.
- The seeded administrator password is set in two places that must agree:
  `supabase/export/full-setup.sql` (fresh databases) and
  `20260921100000_admin_credential_and_staff_blank_sheets.sql` (existing ones).
  `crypt`/`gen_salt` need the `extensions` schema prefix on Supabase, with a
  `public` fallback for stock Postgres.
- Regenerate the route tree with `npm run build` after adding route files, or
  `tsc` will complain about unknown route paths.
- `unit_id` on `staff_profiles` only exists after
  `20260918120000_staff_departments_and_scores.sql` has been applied to the
  target database. Until then there is no department scoping and staff see
  nothing. Profile reads tolerate the missing column so a stale database
  degrades instead of impersonating a missing profile — treat every
  "has the staff-department migration run?" log line as a deployment warning.

## School news / announcements

- Posts live in `public.news_posts`; images and documents live in
  `public.news_attachments` with the files in the private `news-media` bucket.
  Migration `20261007000000_school_news.sql`; fresh databases get the same
  objects from `supabase/export/full-setup.sql`.
- Only `admin` holds the `news.manage` permission, so only an administrator can
  publish; staff and the public read the posts without signing in.
- The public Umutu page (`src/components/site/news-section.tsx`) renders the
  posts in a horizontal snap-scroll **carousel** of equal-height cards — a card
  shows a teaser (`line-clamp-4`) plus a "Read more" button when the body is long
  or the post has attachments. "Read more" opens a modal reader
  (`PostReader`) that holds the full text, the image gallery and the document
  links; Escape or a backdrop click closes it. The carousel is bounded to
  `NEWS_VISIBLE_LIMIT` (4) posts: every pinned post first, then the newest
  unpinned ones. `selectPostsToPrune` in `src/lib/news.functions.ts` is the
  single source of truth for which post is dropped after a write — adding a
  fifth post removes the oldest *unpinned* post and its media, while a pinned
  post keeps its place and the just-saved post is never the one removed. It is
  pure and unit-testable; keep it that way. **Drafts are excluded** from the
  count: a draft never shows publicly, never fills a slot and is never pruned.
- Posts can be **drafts**. `news_posts.is_draft` (migration
  `20261008000000_news_drafts.sql`, plus `full-setup.sql`) keeps a work-in-progress
  post off the public page; the `is_draft = false` RLS policy and the
  `listNewsPosts` filter both enforce it. `createNewsPost`/`updateNewsPost`
  take `is_draft` and echo it back so the admin page can word the confirmation.
  The admin form also mirrors the title/body/pinned fields to
  `localStorage` (`dsvec:news-draft:<id|new>`) as the user types (600 ms
  debounce) and every 20 s, then offers to restore or discard them on remount.
  Autosave is frozen (`skipAutosave` ref) while a save is in flight so a queued
  snapshot cannot clobber the saved record; a successful save clears the local
  copy. The local copy is only a convenience for a lost connection - the server
  record (draft or published) remains the durable one, so tell the admin to use
  "Save as draft" for anything they want to keep, not just rely on autosave.
- Media is private. `news.functions.ts` signs short-lived URLs on the server and
  hands them to the client, so the public page previews/downloads documents
  without exposing the bucket. Images are re-encoded on the client before
  upload; documents are sent as data URLs and re-validated server-side
  (`NEWS_IMAGE_MAX_BYTES`, `NEWS_DOC_MAX_BYTES`, mime allow-lists).
- The admin page is `src/routes/_authenticated/admin/news.tsx` (nav entry gated
  by `news.manage`).
- Route tree is regenerated by `npm run build`; run it after adding the route
  file or `tsc` complains about the unknown path.

## Graduation, storage clean-up and the free plan

- `graduated` is a real `application_status` enum value (added by
  `20261002000000_graduated_status_and_storage_usage.sql` for existing
  databases and by `supabase/export/full-setup.sql` for fresh ones). Graduating
  an applicant removes them from the class roster — `listStudents`/`getStudent`
  filter `status='admitted'` — and shows them under `/admin/graduates` until the
  clean-up removes them. `STATUSES` in `src/lib/admin.functions.ts` is the single
  source of truth for what the status pickers offer.
- `withdrawn` is retired. It stays in the DB enum and in `FILTER_STATUSES`
  (filters, exports, legacy re-save) but is never offered as a status to set.
- Clean-up functions (`getStorageUsage`, `listArchiveCandidates`,
  `listStaleArchiveRows`, `deleteApplicants`, `deleteArchivedRecords`) require
  the `applicants.manage` permission, held by `admin` only. Unit-scoped `staff`
  cannot purge records.
- Both deletion flows download a `.zip` first and disable the delete button
  until it succeeds. The zip holds `records.xlsx`, a printable application form
  per person (`forms/<app-number>.html`, built by `buildApplicationFormHtml`)
  and a `photos/` folder; the sheet's "Photo File" and "Application Form"
  columns point at each file. `records.xlsx` has two sheets: "Past records" (the
  data) and "Summary" (`buildSummarySheet`), an accounting sheet that reconciles
  the archive — total records, breakdowns by status/unit/stream/gender, and how
  many photos/forms were bundled — so the number download vs. delete can be
  checked before anything is removed. The clean-up panel shows the same
  breakdown in the UI and the delete confirmation names the status counts. The
  schema lives in
  `src/lib/archive-excel.ts`; `exceljs` and `jszip` are imported on demand so
  they stay out of the initial bundle. `listArchivePhotoUrls` signs the private
  `applicant-photos` objects in chunks (150 at a time) and a failed image is
  skipped rather than aborting the export.
- `storage_usage()` reports `pg_database_size()` and the summed
  `storage.objects` metadata size. `getStorageUsage` degrades to
  `unavailable: true` when the function is missing, so a stale database shows a
  message instead of breaking the dashboard.
- Stale applications are those still not admitted `STALE_DAYS` (60) after
  submission. The prompt appears on `/admin/applicants` and on the dashboard
  clean-up panel; graduated and admitted records are never stale.
- `/api/public/keepalive` does a single read so the free database is not idle
  long enough to pause. It is pinged twice a week by
  `.github/workflows/keepalive.yml` (GitHub Actions, `vars.SITE_URL`) and by the
  Vercel cron in `vercel.json`.

## Password resets

- The login "Forgot your password?" panel has two tabs. Staff raise an admin
  request (`requestPasswordReset` in `src/lib/password-reset.functions.ts`,
  stored in `password_reset_requests` and actioned from `/admin/staff`). An
  administrator raises a self-service request (`requestAdminPasswordReset`),
  which emails a recovery link via Supabase's built-in SMTP.
- `password_reset_requests` is defined by
  `supabase/migrations/20260907000000_password_reset_requests.sql` and, for
  fresh databases, `supabase/export/full-setup.sql`. It was originally only in
  `drizzle/migrations/`, which Supabase does not apply — the Supabase copy is
  what a running project actually needs, so keep the two migration folders in
  step (Drizzle mirrors the Supabase set, not the other way around).
- For the emailed link to arrive, the Supabase project must have a working SMTP
  sender and must allow the `/reset-password` URL in Auth → URL Configuration →
  Redirect URLs. Supabase falls back to its rate-limited shared sender otherwise.
- `requestAdminPasswordReset` resolves the account and checks for the `admin`
  role before sending, and always answers `{ ok: true }` — the public form must
  never reveal which emails exist or let a non-admin trigger a reset.
- `/reset-password` (`src/routes/reset-password.tsx`) exchanges the recovery
  token for a session — tokens normally arrive in the URL *fragment*, so it
  reads both the query string and the fragment, and tolerates the `code` (PKCE),
  `token_hash`, and implicit `access_token`/`refresh_token` shapes. Keep that in
  sync with the Supabase Auth flow setting.
- The admin reset does **not** clear `staff_profiles.must_change_password`, so a
  seeded administrator still clears it from `/admin/account` after signing in.
