import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getUser } from "@/lib/admin.functions";
import { requestPasswordReset } from "@/lib/password-reset.functions";
import { adminUserQuery } from "@/lib/use-admin-user";
import { can } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, GraduationCap, Loader2, Lock } from "lucide-react";
import { SITE } from "@/lib/site";

const DESCRIPTION = "Sign in to the DSTVEB Umutu Branch staff portal to manage applications.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Staff Sign In | DSTVEB Umutu Branch" },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForgot, setShowForgot] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(
          "Sign-in failed. Check your network connection, email and password, or contact the portal administrator.",
        );
        setBusy(false);
        return;
      }
      // Start from a clean slate so the previous account's role never leaks in,
      // then resolve this account's role before choosing where to land.
      queryClient.clear();
      let me;
      try {
        me = await getUser();
      } catch {
        await supabase.auth.signOut();
        setError("This account does not have staff portal access. Contact the portal administrator.");
        setBusy(false);
        return;
      }
      queryClient.setQueryData(adminUserQuery.queryKey, me);
      if (me.mustChangePassword) navigate({ to: "/admin/account", replace: true });
      else if (can(me.role, "applicants.read")) navigate({ to: "/admin", replace: true });
      else navigate({ to: "/admin/students", replace: true });
    } catch {
      setError("We could not reach the authentication service. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-md bg-primary text-primary-foreground">
            <Lock className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl text-ink-foreground">Staff sign in</h1>
            <p className="mt-1 text-sm text-ink-muted">{SITE.campusName} — staff portal</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-lg border border-border-strong bg-background p-6 shadow-raised md:p-8"
        >
          {error ? (
            <p
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <label htmlFor="login-email" className="text-sm font-medium text-foreground">
            Staff Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label
            htmlFor="login-password"
            className="mt-4 block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={busy}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => setShowForgot((v) => !v)}
            className="mt-4 w-full text-center text-sm font-medium text-primary hover:underline"
          >
            Forgot your password?
          </button>
        </form>

        {showForgot ? <ForgotPassword defaultEmail={email} /> : null}

        <p className="mt-4 text-center text-sm text-ink-muted">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-primary">
            <GraduationCap className="size-4" aria-hidden="true" /> Back to public website
          </Link>
        </p>
      </div>
    </div>
  );
}

function ForgotPassword({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset({ data: { email, note: note || undefined } });
      setSent(true);
    } catch {
      setError("Could not send your request. Please check the email and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-lg border border-border-strong bg-background p-6 shadow-raised">
      <h2 className="font-display text-lg text-foreground">Reset your password</h2>
      {sent ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Request sent. The portal administrator will set a temporary password for you and share
          it with you. Sign in with it and you will be asked to choose a new password.
        </p>
      ) : (
        <form onSubmit={onSubmit}>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a request to the portal administrator. They will give you a temporary password,
            which you change on your next sign-in.
          </p>
          {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
          <label htmlFor="forgot-email" className="mt-4 block text-sm font-medium text-foreground">
            Staff Email
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <label htmlFor="forgot-note" className="mt-4 block text-sm font-medium text-foreground">
            Message to the administrator (optional)
          </label>
          <input
            id="forgot-note"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. your name and phone number"
            className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Ask administrator to reset
          </button>
        </form>
      )}
    </section>
  );
}
