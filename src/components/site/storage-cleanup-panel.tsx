import { useEffect, useState } from "react";
import { Database, Download, HardDrive, Trash2 } from "lucide-react";

import {
  deleteArchivedRecords,
  getStorageUsage,
  listArchiveCandidates,
  type ArchiveRow,
} from "@/lib/admin.functions";
import { useAdminUser } from "@/lib/use-admin-user";

type Usage = Awaited<ReturnType<typeof getStorageUsage>>;

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

const COLUMNS: { header: string; key: keyof ArchiveRow; width: number }[] = [
  { header: "Application Number", key: "application_number", width: 24 },
  { header: "Full Name", key: "full_name", width: 28 },
  { header: "Email", key: "email", width: 28 },
  { header: "Phone", key: "phone", width: 16 },
  { header: "Gender", key: "gender", width: 10 },
  { header: "Date of Birth", key: "date_of_birth", width: 14 },
  { header: "State of Origin", key: "state", width: 16 },
  { header: "LGA", key: "local_government", width: 16 },
  { header: "Residential Address", key: "address", width: 36 },
  { header: "Next of Kin", key: "next_of_kin", width: 32 },
  { header: "School", key: "school", width: 24 },
  { header: "Qualification", key: "qualification", width: 18 },
  { header: "Trade Unit", key: "unit", width: 24 },
  { header: "Stream", key: "stream", width: 10 },
  { header: "Status", key: "status", width: 14 },
  { header: "Test (40)", key: "test_score", width: 10 },
  { header: "Exam (60)", key: "exam_score", width: 10 },
  { header: "Applied On", key: "applied_on", width: 20 },
];

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
  const allowed = hasPermission("applicants.delete");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState<"" | "download" | "delete">("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [u, r] = await Promise.all([getStorageUsage(), listArchiveCandidates()]);
      setUsage(u);
      setRows(r);
    } catch {
      setMessage("Could not check storage right now.");
    }
  }

  useEffect(() => {
    if (!isLoading && allowed) void load();
  }, [isLoading, allowed]);

  if (!allowed) return null;

  async function download() {
    setBusy("download");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Past records");
      ws.columns = COLUMNS;
      ws.addRows(rows.map((r) => ({ ...r, test_score: r.test_score ?? "", exam_score: r.exam_score ?? "" })));
      ws.getRow(1).font = { bold: true };
      ws.views = [{ state: "frozen", ySplit: 1 }];
      const buf = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(
        new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `dstveb-past-records-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch {
      setMessage("Could not create the Excel file. Please try again.");
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Permanently delete ${rows.length} past record(s) and their photos? Make sure the Excel file is saved safely. This cannot be undone.`,
      )
    )
      return;
    setBusy("delete");
    try {
      const res = await deleteArchivedRecords({ data: { ids: rows.map((r) => r.id) } });
      setMessage(`Deleted ${res.deleted} past record(s).`);
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
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Checking storage…</p>
      )}

      {usage?.over_limit ? (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          Storage is almost full. Please download the past records and then delete them to free
          up space.
        </p>
      ) : null}

      <p className="mt-4 text-sm text-muted-foreground">
        {rows.length} past record(s): graduated, rejected or withdrawn, and earlier-stream
        applications that were never admitted. Current students are never included. You must
        download the Excel file first before deleting.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          disabled={!rows.length || busy !== ""}
          className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-paper px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden="true" />
          {busy === "download" ? "Preparing…" : "1. Download Excel"}
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
