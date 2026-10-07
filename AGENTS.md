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
  until it succeeds. The zip holds `records.xlsx` plus a `photos/` folder; the
  sheet's "Photo File" column points at each image. The schema lives in
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
