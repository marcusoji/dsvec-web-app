# DSTVEB Umutu Branch — Website & Application Portal

The institutional website and online admission platform for the **Umutu Branch** of the
Delta State Technical and Vocational Education Board (DSTVEB).

The site has three parts:

- **Board landing page** — the DSTVEB centre directory across Delta State, listing every
  vocational centre. Only Umutu currently has an online portal.
- **Umutu branch site** — the public institution website: trade unit directory, admissions
  information, and the online application flow.
- **Staff portal** — an authenticated back office for reviewing applicants, tracking
  statistics, and auditing activity.

Applicants never create accounts or passwords. They apply once, receive an application
number, and use a private access token to retrieve and print their form later. Only staff
sign in.

## Features

**Public site**

- Board landing page with a directory of all DSTVEB centres in Delta State
- Trade unit directory with per-unit detail pages — skills taught, career outcomes,
  entry requirements and duration
- Admissions information and institution contact details
- Responsive, mobile-first layout with an institutional design system

**Online applications**

- Six-step guided application form (personal, contact, guardian & education, trade unit,
  photograph, review) with per-step validation
- Passport photograph upload (JPEG, PNG or WebP, 2 MB maximum, stored in a private bucket)
- Automatic application number generation in the form `DSTVEB-UMU-<year>-<serial>`,
  using the Africa/Lagos calendar year
- Duplicate prevention — a unique index on normalised email plus phone number means an
  applicant cannot register twice, and a blocked attempt is recorded for staff review
- Retrieval of an existing application via a private link, plus a staff-assisted lookup
- Printable A4 application form (Print / Save as PDF) that renders consistently in print

**Staff portal**

- Dashboard with registration statistics and recent activity
- Applicant list with filtering, search, pagination (20 per page) and CSV export
- Applicant detail view with photograph and status management
- Duplicate audit — applications and attempts blocked by the duplicate check
- Audit log of staff actions
- Role-based access control and a forced password change on first sign-in

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, SSR) |
| Routing | [TanStack Router](https://tanstack.com/router) — file-based, type-safe |
| Build | Vite 8 (Nitro server bundle) |
| Styling | Tailwind CSS v4 |
| Components | [shadcn/ui](https://ui.shadcn.com) (New York style, slate base) + lucide-react icons |
| Forms | react-hook-form with Zod validation |
| Data fetching | TanStack Query |
| Backend | [Supabase](https://supabase.com) — Postgres, Auth, Storage |
| Language | TypeScript, strict mode |

## Getting started

You need **Node.js 22+** and npm. See [installing Node with
nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

The dev server starts on <http://localhost:8080>.

### Environment variables

Supabase credentials are read from `.env` in the project root:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL (client) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable / anon key (client) |
| `VITE_SUPABASE_PROJECT_ID` | Project reference (client) |
| `SUPABASE_URL` | Project URL (server) |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable / anon key (server) |
| `SUPABASE_PROJECT_ID` | Project reference (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server only, never expose to the client** |

The committed `.env` holds only the public publishable keys, which are protected by row
level security. The service role key must be supplied through your deployment platform's
environment settings and never committed — it bypasses RLS entirely.

`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are read at runtime by server-side code
(authentication middleware and public data queries), and `SUPABASE_SERVICE_ROLE_KEY` is
required by any route that reads or writes applicant data through the admin client. A
build succeeds without them, but those paths fail once the app is running, so set all
three in every deployed environment.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Production build |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## Project structure

```
src/
  routes/                 File-based routes (see src/routes/README.md)
    __root.tsx            App shell — wraps every page, owns the loading overlay
    index.tsx             Board landing page and centre directory
    umutu.tsx             Umutu branch home
    about.tsx             About the institution
    units/                Trade unit directory and detail pages
    admissions.tsx        Admissions information
    apply.tsx             Six-step application form
    login.tsx             Staff sign-in
    application/$token.tsx  Printable application form (private link)
    _authenticated/       Staff portal (client-only, guarded)
  components/
    site/site-shell.tsx   Public site layout
    ui/                   shadcn/ui components
  integrations/supabase/  Supabase clients and auth middleware
  lib/
    *.functions.ts        TanStack Start server functions
    validation.ts         Zod schemas and shared form constants
    permissions.ts        Roles and permissions
    admin-auth.ts         Staff authorization middleware
    site.ts, branches.ts  Institution and centre metadata
  server.ts               SSR entry with error normalisation
  start.ts                Request middleware (CSRF, auth, errors)
supabase/
  migrations/             Numbered schema migrations
  export/full-setup.sql   Full schema, seed data and staff admin — run once
public/                   Static assets
```

## Data model

Six tables in the `public` schema:

| Table | Purpose |
| --- | --- |
| `units` | Trade units — description, skills, careers, requirements, duration, coordinator contact, active flag |
| `applicants` | Applicant records, application number, access token and status |
| `applicant_documents` | Uploaded documents; photographs live in the private `applicant-photos` bucket |
| `user_roles` | Staff roles, held separately from profile rows |
| `staff_profiles` | Staff display name and first-login password state |
| `activity_log` | Audit trail of staff actions and blocked duplicate attempts |

Enums: `application_status`, `app_role`, `document_kind`.

The `applicants.application_number` column defaults to a function that draws from a
sequence, so the number is fixed at insert time and never changes. Supporting objects
include `has_role()` for RLS policies, `set_updated_at()` triggers, and indexes on status,
unit and creation date for admin filtering.

Application status is one of: `submitted`, `under_review`, `shortlisted`, `admitted`,
`rejected`, `withdrawn`.

### Setting up the database

Run `supabase/export/full-setup.sql` once in a fresh Supabase project's SQL editor. It
creates every table, policy, storage bucket and function, then seeds the trade units and
the initial staff admin account. After seeding, turn **off** "Allow new users to sign up"
in Authentication settings — staff accounts are created manually.

The seeded admin signs in with `dsvecumutu@gmail.com` / `Admin@umutudsvec27` and can
change it at `/admin/account` at any time.

## Routes

**Public** — `/` (board directory), `/umutu`, `/about`, `/units`, `/units/:slug`,
`/admissions`, `/apply`, `/contact`, `/application/:token`

**Staff portal** — `/login`, then under `/_authenticated`: `/admin` (dashboard),
`/admin/applicants`, `/admin/applicants/:id`, `/admin/duplicates`, `/admin/audit`,
`/admin/account`

The staff portal is rendered client-only, because Supabase keeps its session in
`localStorage` where the server cannot read it. Data loaders therefore always run with a
bearer token attached instead of failing authorization during SSR. All admin server
functions are additionally guarded by middleware that verifies the token and resolves the
caller's role server-side. The portal is marked `noindex, nofollow`.

### Roles and permissions

Roles are stored in `user_roles` and mapped to a least-privilege permission set; when a
user holds more than one, the highest-privilege role wins.

| Role | Permissions |
| --- | --- |
| `admin` | All permissions |
| `registrar` | Read applicants, update status, export CSV, read audit |
| `reviewer` | Read applicants, read audit |
| `staff` | Read students and scores in their own trade unit |

Permissions: `applicants.read`, `applicants.status.update`, `applicants.export`,
`audit.read`, `staff.manage`, `students.read`, `scores.read`, `scores.write`. Portal
navigation only surfaces pages the signed-in role can open.

Department staff (`staff`) never see the Applicants, Duplicate audit or Audit log pages.
They get a read-only roster of the admitted students in their own trade unit and the two
official printouts issued from it:

- **Contact list** — name, application number and phone number.
- **Scoresheet** — name, application number and blank C.A. / examination boxes for the
  assessor to fill in by hand.

Scores are also entered in the portal (test /40, exam /60) at `/admin/students/:id/scoresheet`.

## Application lifecycle

The application number, the application record and the printable form are one artefact.
Downloading, re-downloading or printing a form represents an existing application and never
creates a new one, and returning to the registration page does not register the applicant
again.

```
Discover → Apply → Validate → Application number → Printable form
       → Return later → Detect existing application → Reprint form
```

Applicants identify themselves with their email address and phone number. Both are
normalised before storage and comparison; a match returns the existing application and an
access link rather than creating a duplicate.

## Deployment

Deployment is documented separately in [DEPLOY.md](DEPLOY.md) — it covers hosting on
Vercel against your own Supabase project.

`vercel.json` supplies the build and install commands, so no framework preset is needed.
Setting the `VERCEL` environment variable switches the server bundle to Vercel's Node
runtime and emits it to `.vercel/output`; see `vite.config.ts`.

## Development notes

- **Do not rewrite published git history.** This project is connected to
  [Lovable](https://lovable.dev) — force pushing, rebasing or amending pushed commits
  rewrites history on Lovable's side and can lose project history. Keep the connected
  branch in a working state, since commits pushed to it sync back into the editor.
- Routes are file-based. `src/routes/README.md` documents the naming conventions, and
  `src/routeTree.gen.ts` is generated — do not edit it by hand.
- Configuration for the Vite build, including the TanStack Start plugin set, comes from
  `@lovable.dev/vite-tanstack-config`. Adding those plugins manually causes duplicate
  plugin errors.
- Secrets belong in environment variables, not in source. Admin operations use the service
  role client in server functions only.

This project was built with [Lovable](https://lovable.dev). Continue developing it in the
[Lovable editor](https://lovable.dev/projects/95908de4-ffc7-43f1-8ebd-114d1ec86f81).