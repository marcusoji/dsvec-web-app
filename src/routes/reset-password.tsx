import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, GraduationCap, KeyRound, Loader2, Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";

const DESCRIPTION =
  "Choose a new password for your administrator account on the DSTVEB Umutu Branch portal.";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password | DSTVEB Umutu Branch" },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search["code"] === "string" ? search["code"] : undefined,
    token_hash: typeof search["token_hash"] === "string" ? search["token_hash"] : undefined,
    error: typeof search["error"] === "string" ? search["error"] : undefined,
    error_description:
      typeof search["error_description"] === "string" ? search["error_description"] : undefined,
  }),
  component: ResetPasswordPage,
});

/** Supabase appends its recovery tokens to the URL fragment, which the router's
 * search parser cannot see; read both the query string and the fragment, for
 * tokens and for the `error`/`error_description` an expired link carries. */
function readTokens() {
  if (typeof window === "undefined") return {};
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const pick = (key: string) => fromHash.get(key) ?? undefined;
  return {
    access_token: pick("access_token"),
    refresh_token: pick("refresh_token"),
    code: pick("code"),
    token_hash: pick("token_hash"),
    error: pick("error"),
    error_description: pick("error_description"),
  };
}

function ResetPasswordPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // Establish the temporary recovery session the emailed link carries.
  useEffect(() => {
    let cancelled = false;

    async function establish() {
      const frag = readTokens();
      const errorCode = search.error ?? frag.error;
      const errorDescription = search.error_description ?? frag.error_description;

      if (errorCode || errorDescription) {
        if (!cancelled) {
          setLinkError(
            errorDescription ?? "This reset link is invalid or has expired. Ask for a new one.",
          );
        }
        return;
      }

      const code = search.code ?? frag.code;
      const tokenHash = search.token_hash ?? frag.token_hash;
      const accessToken = frag.access_token;
      const refreshToken = frag.refresh_token;

      try {
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash) {
          // Recovery links are the only kind this page issues.
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (verifyError) throw verifyError;
        } else {
          throw new Error("This page needs the link from your reset email.");
        }
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setLinkError(
            err instanceof Error && err.message
              ? err.message
              : "This reset link is invalid or has expired. Ask for a new one.",
          );
        }
      }
    }

    void establish();
    return () => {
      cancelled = true;
    };
    // Runs once per mount; the tokens are read from the URL at that point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Use at least 10 characters.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError("Include an uppercase letter, a lowercase letter and a number.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      // End the recovery session; the administrator signs in fresh.
      await supabase.auth.signOut();
      setDone(true);
      setPassword("");
      setConfirm("");
      setTimeout(() => navigate({ to: "/login", replace: true }), 2500);
    } catch {
      setError("We could not reach the authentication service. Please try again.");
    } finally {
      setSaving(false);
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
            <h1 className="font-display text-2xl text-ink-foreground">Choose a new password</h1>
            <p className="mt-1 text-sm text-ink-muted">{SITE.campusName} — administrator</p>
          </div>
        </div>

        <section className="rounded-lg border border-border-strong bg-background p-6 shadow-raised md:p-8">
          {linkError ? (
            <div>
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {linkError}
              </p>
              <Link
                to="/login"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <GraduationCap className="size-4" aria-hidden="true" /> Back to sign in
              </Link>
            </div>
          ) : done ? (
            <p role="status" className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              Your password has been changed. Taking you to sign in…
            </p>
          ) : !ready ? (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking your reset
              link…
            </p>
          ) : (
            <form onSubmit={onSubmit}>
              <h2 className="flex items-center gap-2 font-display text-lg text-foreground">
                <KeyRound className="size-4 text-primary" aria-hidden="true" /> New password
              </h2>

              {error ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <label
                htmlFor="reset-password"
                className="mt-4 block text-sm font-medium text-foreground"
              >
                New password
              </label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                At least 10 characters with upper case, lower case and a number.
              </p>

              <label
                htmlFor="reset-confirm"
                className="mt-4 block text-sm font-medium text-foreground"
              >
                Confirm new password
              </label>
              <input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />

              <button
                type="submit"
                disabled={saving}
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {saving ? "Saving…" : "Change password"}
              </button>
            </form>
          )}
        </section>

        <p className="mt-4 text-center text-sm text-ink-muted">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-primary">
            <GraduationCap className="size-4" aria-hidden="true" /> Back to public website
          </Link>
        </p>
      </div>
    </div>
  );
}
