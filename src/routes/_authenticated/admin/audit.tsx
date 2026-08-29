import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollText, ShieldAlert } from "lucide-react";

import { listAuditLog, type AuditRow } from "@/lib/admin.functions";
import { useAdminUser } from "@/lib/use-admin-user";

const EVENT_LABELS: Record<string, string> = {
  status_updated: "Status change",
  applicants_exported: "CSV export",
  duplicates_viewed: "Duplicate check",
  duplicate_attempt: "Duplicate blocked",
  password_changed: "Password change",
  application_submitted: "Application submitted",
};

const FILTERS = [
  { value: "", label: "All events" },
  { value: "status_updated", label: "Status changes" },
  { value: "applicants_exported", label: "CSV exports" },
  { value: "duplicates_viewed", label: "Duplicate checks" },
  { value: "duplicate_attempt", label: "Duplicates blocked" },
  { value: "password_changed", label: "Password changes" },
];

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit log | DSTVEB Umutu Branch Staff Portal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuditPage,
});

function stamp(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

function AuditPage() {
  const [eventType, setEventType] = useState("");
  const { hasPermission, isLoading: loadingUser } = useAdminUser();
  const allowed = hasPermission("audit.read");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", eventType],
    queryFn: () =>
      listAuditLog({ data: { limit: 200, ...(eventType ? { event_type: eventType } : {}) } }),
    enabled: allowed,
  });

  if (!loadingUser && !allowed) {
    return (
      <section className="surface-card flex items-start gap-3 p-6">
        <ShieldAlert className="mt-0.5 size-5 text-primary" aria-hidden="true" />
        <div>
          <h1 className="font-display text-lg">Not permitted</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your staff role does not include access to the audit trail.
          </p>
        </div>
      </section>
    );
  }

  const rows: AuditRow[] = data ?? [];

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-display">
            <ScrollText className="size-5 text-primary" aria-hidden="true" /> Audit log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status changes, exports and duplicate checks with timestamps and the acting staff
            account.
          </p>
        </div>
        <label className="text-sm">
          <span className="sr-only">Filter by event type</span>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="surface-card mt-6 p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading audit entries…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No audit entries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">When (WAT)</th>
                  <th className="px-5 py-3 font-medium">Event</th>
                  <th className="px-5 py-3 font-medium">Actor</th>
                  <th className="px-5 py-3 font-medium">Application</th>
                  <th className="px-5 py-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {stamp(r.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs">
                        {EVENT_LABELS[r.event_type] ?? r.event_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="block font-medium">{r.actor_email ?? "System"}</span>
                      {r.actor_user_id ? (
                        <span className="block font-mono text-[0.7rem] text-muted-foreground">
                          {r.actor_user_id}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{r.application_number ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.detail ?? "—"}</td>
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
