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
- Regenerate the route tree with `npm run build` after adding route files, or
  `tsc` will complain about unknown route paths.

