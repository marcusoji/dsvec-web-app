import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import {
  deleteApplicants,
  listStaleApplicants,
  STALE_DAYS,
  type StaleApplicant,
} from "@/lib/admin.functions";
import { useAdminUser } from "@/lib/use-admin-user";

export function StaleApplicantsPrompt({ onDeleted }: { onDeleted: () => void }) {
  const { hasPermission, isLoading } = useAdminUser();
  const allowed = hasPermission("applicants.delete" as never);
  const [rows, setRows] = useState<StaleApplicant[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const res = await listStaleApplicants();
      setRows(res);
      setSelected(new Set(res.map((r) => r.id)));
    } catch {
      setRows([]);
    }
  }

  useEffect(() => {
    if (!isLoading && allowed) void load();
  }, [isLoading, allowed]);

  if (!allowed || (rows.length === 0 && !message)) return null;

  async function confirmDelete() {
    if (!selected.size) return;
    if (!window.confirm(`Permanently delete ${selected.size} application(s)? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      const res = await deleteApplicants({ data: { ids: [...selected] } });
      setMessage(`Deleted ${res.deleted} application(s).`);
      setOpen(false);
      await load();
      onDeleted();
    } catch {
      setMessage("Could not delete the selected applications. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div className="surface-card mt-6 border-l-4 border-l-primary p-4">
      {rows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <AlertTriangle className="size-4 text-primary" aria-hidden="true" />
            <span>
              <strong>{rows.length}</strong> application(s) are over {STALE_DAYS} days old and
              still not admitted. Would you like to delete them?
            </span>
          </p>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-md border border-border-strong bg-paper px-3 py-1.5 text-sm font-semibold"
          >
            {open ? "Hide list" : "Review & delete"}
          </button>
        </div>
      ) : null}
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
      {open ? (
        <div className="mt-4">
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                  aria-label={`Select ${r.full_name}`}
                />
                <span className="font-mono text-xs">{r.application_number}</span>
                <span className="font-medium">{r.full_name}</span>
                <span className="ml-auto capitalize text-muted-foreground">
                  {r.status.replace(/_/g, " ")} · {new Date(r.created_at).toLocaleDateString("en-GB")}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={busy || !selected.size}
            onClick={confirmDelete}
            className="mt-3 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
          >
            {busy ? "Deleting…" : `Delete ${selected.size} selected`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
