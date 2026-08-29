import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { confirmPasswordChanged } from "@/lib/admin.functions";
import { adminUserQuery, useAdminUser } from "@/lib/use-admin-user";
import { ROLE_LABELS } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/account")({
  head: () => ({
    meta: [
      { title: "Your account | DSTVEB Umutu Branch Staff Portal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAdminUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const mustChange = user?.mustChangePassword ?? false;

  async function onSubmit(event: React.FormEvent) {
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }
    await confirmPasswordChanged();
    await queryClient.invalidateQueries({ queryKey: adminUserQuery.queryKey });
    setSaving(false);
    setDone(true);
    setPassword("");
    setConfirm("");
    router.navigate({ to: "/admin" });
  }

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="flex items-center gap-2 text-2xl font-display">
        <KeyRound className="size-5 text-primary" aria-hidden="true" /> Your account
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {user?.email ?? "Signed in"} · {user ? ROLE_LABELS[user.role] : "Staff"}
      </p>

      {mustChange ? (
        <div className="mt-6 rounded-md border border-primary/40 bg-accent/40 p-4 text-sm">
          <strong className="font-semibold">Change your password to continue.</strong> This account
          still uses the shared seeded credential. Set a private password before using the portal.
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="surface-card mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            At least 10 characters with upper case, lower case and a number.
          </p>
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        {done ? (
          <p role="status" className="text-sm font-medium text-primary-foreground">
            Password updated.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Update password
        </button>
      </form>
    </section>
  );
}
