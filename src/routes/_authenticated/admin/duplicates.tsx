import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { listDuplicateAttempts, type DuplicateRow } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/duplicates")({
  head: () => ({
    meta: [
      { title: "Duplicate Audit | DSTVEB Umutu Staff Portal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Duplicates,
});

function dateTimeLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

function Duplicates() {
  const [rows, setRows] = useState<DuplicateRow[] | null>(null);

  useEffect(() => {
    listDuplicateAttempts()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  return (
    <section>
      <div>
        <h1 className="text-2xl font-display">Duplicate-attempt audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registration attempts that were blocked because the email or phone number was already
          registered.
        </p>
      </div>

      <div className="surface-card mt-6 overflow-hidden">
        {rows === null ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Loading audit log…</p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <AlertTriangle className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No duplicate attempts recorded</p>
            <p className="text-sm text-muted-foreground">
              Blocked registration attempts will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-border bg-secondary/60">
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Existing application</th>
                  <th className="px-4 py-3 font-medium">Email (masked)</th>
                  <th className="px-4 py-3 font-medium">Phone (masked)</th>
                  <th className="px-4 py-3 font-medium">Detail</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-mono text-xs">{r.application_number ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email_masked ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.phone_masked ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.detail ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {dateTimeLabel(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
