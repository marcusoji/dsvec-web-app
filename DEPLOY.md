# Hosting DSTVEB Umutu yourself (Vercel + your own Supabase)

Lovable keeps working as-is. Follow these steps only when you are ready to move.

## 1. Database (your own Supabase project)

1. Create a new Supabase project.
2. Open the SQL editor, paste the whole of `supabase/export/full-setup.sql`, run it once.
   It creates every table, permission, storage bucket, the 15 trade units and the staff admin
   (`dsvecumutu@gmail.com`).
3. In Authentication settings, turn **off** "Allow new users to sign up" (staff accounts are created manually).
4. Copy from Project Settings → API: the project URL, the publishable/anon key and the service role key.

## 2. Vercel

1. Connect this project to GitHub from Lovable (Project settings → GitHub), then import the repo in Vercel.
   `vercel.json` already tells Vercel how to build; no framework preset is needed.
2. Add these environment variables in Vercel (Production and Preview):

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon / publishable key |
| `VITE_SUPABASE_PROJECT_ID` | project ref |
| `SUPABASE_URL` | your project URL |
| `SUPABASE_PUBLISHABLE_KEY` | anon / publishable key |
| `SUPABASE_PROJECT_ID` | project ref |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (server only) |

3. Deploy. Vercel sets `VERCEL=1` automatically, which switches the build to the Vercel target
   (see `vite.config.ts`). Builds inside Lovable are unaffected.

## 3. After the switch

- Sign in at `/login` with the admin account and change the password at `/admin/account`.
- Point your domain at Vercel.
