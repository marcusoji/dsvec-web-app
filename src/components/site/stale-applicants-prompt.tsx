import { useEffect, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";

import {
  deleteApplicants,
  listStaleArchiveRows,
  STALE_DAYS,
  type ArchiveRow,
} from "@/lib/admin.functions";
import { downloadArchiveBundle } from "@/lib/archive-excel";
import { useAdminUser } from "@/lib/use-admin-user";

export function StaleApplicantsPrompt({ onDeleted }: { onDeleted: () => void }) {
  const { hasPermission, isLoading } = useAdminUser();
  const allowed = hasPermission("applicants.manage");
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState<"" | "download" | "delete">("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const res = await listStaleArchiveRows();
      setRows(res);
      setSelected(new Set(res.map((r) => r.id)));
      setDownloaded(false);
    } catch {
      setRows([]);
    }
  }

  useEffect(() => {
    if (!isLoading && allowed) void load();
  }, [isLoading, allowed]);

  if (!allowed) return null;

  async function download() {
    if (!selected.size) return;
    setBusy("download");
    try {
      const chosen = rows.filter((r) => selected.has(r.id));
      const { photos, forms, records } = await downloadArchiveBundle(
        chosen,
        "dstveb-old-applications",
      );
      setDownloaded(true);
      setMessage(
        `Downloaded ${records} record(s): records.xlsx, ${forms} application form(s)` +
          `${photos ? `, ${photos} photo(s)` : ""}. The delete button is now unlocked.`,
      );
    } catch {
      setMessage("Could not create the download. Please try again.");
    } finally {
      setBusy("");
    }
  }

  async function confirmDelete() {
    if (!selected.size || !downloaded) return;
    if (
      !window.confirm(
        `Permanently delete ${selected.size} application(s) and their photos?\n\n` +
          `Make sure the zip (records.xlsx + ${selected.size} application form(s) + photos) is ` +
          `saved safely — everything selected is removed and cannot be recovered.`,
      )
    )
      return;
    setBusy("delete");
    try {
      const res = await deleteApplicants({ data: { ids: [...selected] } });
      setMessage(`Deleted ${res.deleted} application(s).`);
      setOpen(false);
      await load();
      onDeleted();
    } catch {
      setMessage("Could not delete the selected applications. Please try again.");
    } finally {
      setBusy("");
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    setDownloaded(false);
  }

  return (
    <div className="surface-card mt-6 border-l-4 border-l-primary p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm">
          <AlertTriangle
            className={`size-4 ${rows.length ? "text-primary" : "text-muted-foreground"}`}
            aria-hidden="true"
          />
          {rows.length > 0 ? (
            <span>
              <strong>{rows.length}</strong> application(s) are over {STALE_DAYS} days old and still
              not admitted. Download them as Excel, then delete them.
            </span>
          ) : (
            <span className="text-muted-foreground">
              No applications are over {STALE_DAYS} days old without admission. The delete button
              unlocks when there are.
            </span>
          )}
        </p>
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() => setOpen((o) => !o)}
          className="rounded-md border border-border-strong bg-paper px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {open ? "Hide list" : "Review old applications"}
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
      {open && rows.length > 0 ? (
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
                  {r.status} · {r.applied_on}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== "" || !selected.size}
              onClick={download}
              className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-paper px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              <Download className="size-4" aria-hidden="true" />
              {busy === "download" ? "Preparing…" : "1. Download Excel + photos"}
            </button>
            <button
              type="button"
              disabled={busy !== "" || !selected.size || !downloaded}
              onClick={confirmDelete}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "delete" ? "Deleting…" : `2. Delete ${selected.size} selected`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
