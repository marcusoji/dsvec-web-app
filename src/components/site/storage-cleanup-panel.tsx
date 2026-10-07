import { useEffect, useState } from "react";
import { Database, Download, HardDrive, Trash2 } from "lucide-react";

import {
  deleteArchivedRecords,
  getStorageUsage,
  listArchiveCandidates,
  type ArchiveRow,
  type StorageUsage,
} from "@/lib/admin.functions";
import { downloadArchiveBundle } from "@/lib/archive-excel";
import { useAdminUser } from "@/lib/use-admin-user";

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

/** Counts a field across the rows, largest group first. */
function breakdown(rows: ArchiveRow[], key: (row: ArchiveRow) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row) || "—";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function Breakdown({
  title,
  rows,
  of,
}: {
  title: string;
  rows: ArchiveRow[];
  of: (r: ArchiveRow) => string;
}) {
  const groups = breakdown(rows, of);
  if (!groups.length) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1 space-y-0.5 text-sm">
        {groups.map((g) => (
          <li key={g.label} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{g.label}</span>
            <span className="font-semibold tabular-nums">{g.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
      <div
        className={`h-full ${pct >= 100 ? "bg-destructive" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function StorageCleanupPanel() {
  const { hasPermission, isLoading } = useAdminUser();
  const allowed = hasPermission("applicants.manage");
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState<"" | "download" | "delete">("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [u, r] = await Promise.all([getStorageUsage(), listArchiveCandidates()]);
      setUsage(u);
      setRows(r);
      setDownloaded(false);
    } catch {
      setMessage("Could not check storage right now.");
    }
  }

  useEffect(() => {
    if (!isLoading && allowed) void load();
  }, [isLoading, allowed]);

  if (!allowed) return null;

  async function download() {
    if (!rows.length) return;
    setBusy("download");
    try {
      const { photos, forms, records } = await downloadArchiveBundle(rows, "dstveb-past-records");
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

  async function remove() {
    if (!downloaded || !rows.length) return;
    const byStatus = breakdown(rows, (r) => r.status)
      .map((g) => `${g.value} ${g.label}`)
      .join(", ");
    if (
      !window.confirm(
        `Permanently delete ${rows.length} past record(s) and their photos?\n\n` +
          `By status: ${byStatus}.\n\n` +
          `Make sure the zip (records.xlsx + ${rows.length} application form(s) + photos) ` +
          `is saved safely — everything listed here is removed and cannot be recovered.`,
      )
    )
      return;
    setBusy("delete");
    try {
      const res = await deleteArchivedRecords({ data: { ids: rows.map((r) => r.id) } });
      if (res.deleted !== rows.length) {
        setMessage(
          `Deleted ${res.deleted} of ${rows.length} record(s). The rest are no longer eligible ` +
            `(they may be current students now). Review the list and try again.`,
        );
      } else {
        setMessage(`Deleted ${res.deleted} past record(s).`);
      }
      setDownloaded(false);
      await load();
    } catch {
      setMessage("Could not delete the past records. Please try again.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="surface-card mt-6 p-5" aria-labelledby="storage-heading">
      <h2 id="storage-heading" className="text-lg font-display">
        Storage &amp; clean-up
      </h2>
      {usage ? (
        usage.unavailable ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Storage usage is not available yet. Apply the latest database migration to enable the
            free-plan size check.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 text-sm">
                <Database className="size-4" aria-hidden="true" /> Database: {mb(usage.db_bytes)} of{" "}
                {mb(usage.db_limit)}
              </p>
              <Bar used={usage.db_bytes} limit={usage.db_limit} />
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm">
                <HardDrive className="size-4" aria-hidden="true" /> Photos: {mb(usage.bucket_bytes)}{" "}
                of {mb(usage.bucket_limit)}
              </p>
              <Bar used={usage.bucket_bytes} limit={usage.bucket_limit} />
            </div>
          </div>
        )
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Checking storage…</p>
      )}

      {usage?.over_limit ? (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          Storage is almost full. Please download the past records and then delete them to free up
          space.
        </p>
      ) : null}

      <p className="mt-4 text-sm text-muted-foreground">
        {rows.length} past record(s): graduated, rejected or withdrawn, and earlier-stream
        applications that were never admitted. Current students are never included. You must
        download the records (Excel + a printable application form and photograph per person) first
        before deleting.
      </p>

      {rows.length ? (
        <div className="mt-4 rounded-md border border-border bg-secondary/40 p-4">
          <p className="text-sm font-semibold">
            Before you delete: {rows.length} record(s) accounted for
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The zip will contain {rows.length} row(s) in records.xlsx plus {rows.length} application
            form(s). The delete step removes every record counted below — nothing more, nothing
            less.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Breakdown title="By status" rows={rows} of={(r) => r.status} />
            <Breakdown title="By trade unit" rows={rows} of={(r) => r.unit} />
            <Breakdown title="By stream" rows={rows} of={(r) => r.stream} />
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          disabled={!rows.length || busy !== ""}
          className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-paper px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden="true" />
          {busy === "download" ? "Preparing…" : "1. Download records + forms + photos"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={!downloaded || !rows.length || busy !== ""}
          className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {busy === "delete" ? "Deleting…" : "2. Delete past records"}
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}
