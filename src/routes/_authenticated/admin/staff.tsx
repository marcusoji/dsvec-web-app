import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Loader2, PlusCircle, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import {
  createStaff,
  deleteStaff,
  listResetRequests,
  listStaff,
  resolveResetRequest,
  resetStaffPassword,
  updateStaff,
  type StaffMember,
} from "@/lib/school.functions";
import { listUnits } from "@/lib/units.functions";
import { requiresUnit, ROLE_LABELS, type StaffRole } from "@/lib/permissions";
import { useAdminUser } from "@/lib/use-admin-user";

const DESCRIPTION = "Create and manage staff accounts for the DSTVEB Umutu Branch staff portal.";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff accounts | DSTVEB Umutu Branch Staff Portal" },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffPage,
});

const ASSIGNABLE_ROLES = ["staff", "registrar", "reviewer"] as const;
const EDITABLE_ROLES: StaffRole[] = ["staff", "registrar", "reviewer", "admin"];

const staffQuery = {
  queryKey: ["admin-staff"] as const,
  queryFn: () => listStaff(),
};

const unitsQuery = {
  queryKey: ["units", "active"] as const,
  queryFn: () => listUnits(),
};

/** Shared password rules so client and server agree. */
function validatePassword(password: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  if (!/[A-Z]/.test(password)) return "Include an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Include a lowercase letter.";
  if (!/\d/.test(password)) return "Include a number.";
  return null;
}

function stamp(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

function StaffPage() {
  const { user, hasPermission, isLoading: loadingUser } = useAdminUser();
  const allowed = hasPermission("staff.manage");
  const queryClient = useQueryClient();

  const { data: staff, isLoading } = useQuery({ ...staffQuery, enabled: allowed });
  const { data: units } = useQuery({ ...unitsQuery, enabled: allowed });
  const { data: resetRequests } = useQuery({
    queryKey: ["reset-requests"],
    queryFn: () => listResetRequests(),
    enabled: allowed,
  });

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [unitId, setUnitId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (loadingUser) {
    return <p className="text-sm text-muted-foreground">Checking your access…</p>;
  }
  if (!allowed) {
    return (
      <section className="surface-card p-8">
        <h1 className="flex items-center gap-2 text-xl font-display">
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" /> Staff accounts
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only administrators can manage staff accounts.
        </p>
      </section>
    );
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (requiresUnit(role) && !unitId) {
      setError("Assign a department for this role.");
      return;
    }

    setBusy(true);
    try {
      await createStaff({
        data: {
          email,
          full_name: fullName,
          password,
          role: role as "staff" | "registrar" | "reviewer",
          ...(requiresUnit(role) && unitId ? { unit_id: unitId } : {}),
        },
      });
      setNotice(`Account created for ${email}. They must set a private password on first sign-in.`);
      setEmail("");
      setFullName("");
      setPassword("");
      setUnitId("");
      await queryClient.invalidateQueries({ queryKey: staffQuery.queryKey });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the staff account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 className="flex items-center gap-2 text-2xl font-display">
        <UserPlus className="size-5 text-primary" aria-hidden="true" /> Staff accounts
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create logins for unit staff and control which department they can see.
      </p>

      {(resetRequests ?? []).length > 0 ? (
        <div className="surface-card mt-6 border-primary/50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="size-4" aria-hidden="true" /> Password reset requests
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Find the account below, click Password to set a temporary one, share it with the person,
            then mark the request done.
          </p>
          <ul className="mt-3 divide-y divide-border">
            {(resetRequests ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="min-w-0 break-words">
                  <strong>{r.email}</strong>
                  {r.note ? <span className="text-muted-foreground"> — {r.note}</span> : null}
                  <span className="ml-2 text-xs text-muted-foreground">{stamp(r.createdAt)}</span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await resolveResetRequest({ data: { id: r.id } });
                    await queryClient.invalidateQueries({ queryKey: ["reset-requests"] });
                  }}
                  className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-semibold"
                >
                  Mark done
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={onCreate} className="surface-card mt-6 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <PlusCircle className="size-4" aria-hidden="true" /> New staff account
        </h2>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-md border border-primary/40 bg-accent/40 px-3 py-2 text-sm">
            {notice}
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Full name
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="text-sm font-medium">
            Work email (used to sign in)
            <input
              required
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="text-sm font-medium">
            Temporary password
            <input
              required
              type="text"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              At least 10 characters with an uppercase letter, a lowercase letter and a number.
            </span>
          </label>
          <label className="text-sm font-medium">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Department {requiresUnit(role) ? "(required)" : "(not applicable)"}
            <select
              required={requiresUnit(role)}
              disabled={!requiresUnit(role)}
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <option value="">Select a unit…</option>
              {(units ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <div className="surface-card mt-6 overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-border bg-secondary/60">
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading staff…
                </td>
              </tr>
            ) : (staff ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No staff accounts yet.
                </td>
              </tr>
            ) : (
              (staff ?? []).map((member) => (
                <StaffRow
                  key={member.userId}
                  member={member}
                  units={units ?? []}
                  isSelf={member.userId === user?.userId}
                  onChanged={() => queryClient.invalidateQueries({ queryKey: staffQuery.queryKey })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StaffRow({
  member,
  units,
  isSelf,
  onChanged,
}: {
  member: StaffMember;
  units: Array<{ id: string; name: string }>;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<StaffRole>(member.role);
  const [unitId, setUnitId] = useState(member.unitId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  async function save() {
    setError(null);
    if (requiresUnit(role) && !unitId) {
      setError("Assign a department for this role.");
      return;
    }
    setBusy(true);
    try {
      await updateStaff({
        data: {
          user_id: member.userId,
          role,
          unit_id: requiresUnit(role) ? unitId || null : null,
        },
      });
      setEditing(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this account.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete the account for ${member.email ?? "this staff member"}? They will no longer be able to sign in. This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await deleteStaff({ data: { user_id: member.userId } });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete this account.");
      setBusy(false);
    }
  }

  async function resetPassword() {
    const problem = validatePassword(newPassword);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resetStaffPassword({ data: { user_id: member.userId, password: newPassword } });
      setResetting(false);
      setNewPassword("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset this password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td className="px-4 py-3 font-medium">
        {member.fullName ?? "—"}
        {member.mustChangePassword ? (
          <span className="ml-2 rounded-full border border-border bg-accent/40 px-2 py-0.5 text-[0.7rem]">
            first sign-in pending
          </span>
        ) : null}
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{member.email ?? "—"}</td>
      <td className="px-4 py-3">
        {editing ? (
          <select
            aria-label={`Role for ${member.email ?? member.userId}`}
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {EDITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        ) : (
          ROLE_LABELS[member.role]
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <select
            aria-label={`Department for ${member.email ?? member.userId}`}
            value={unitId}
            disabled={!requiresUnit(role)}
            onChange={(e) => setUnitId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
          >
            <option value="">Select a unit…</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        ) : (
          (member.unitName ?? "—")
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{stamp(member.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                  setRole(member.role);
                  setUnitId(member.unitId ?? "");
                }}
                className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-semibold"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-semibold"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetting((v) => !v);
                  setError(null);
                }}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm font-semibold"
              >
                <KeyRound className="size-3.5" aria-hidden="true" /> Password
              </button>
              {!isSelf ? (
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-destructive/50 px-3 text-sm font-semibold text-destructive disabled:opacity-60"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" /> Delete
                </button>
              ) : null}
            </>
          )}
        </div>
        {resetting ? (
          <div className="mt-2 flex items-center justify-end gap-2">
            <input
              type="text"
              aria-label="New temporary password"
              placeholder="New temporary password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-9 w-56 rounded-md border border-input bg-background px-2 font-mono text-sm"
            />
            <button
              type="button"
              onClick={resetPassword}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              Set
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}
