import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Hourglass,
  PieChart,
  Users,
} from "lucide-react";

import { getAdminStats } from "@/lib/admin.functions";

const DESCRIPTION = "Statistics and activity overview for the DSTVEB Umutu Branch staff portal.";

const statsQuery = {
  queryKey: ["admin-stats"],
  queryFn: () => getAdminStats(),
};

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard | DSTVEB Umutu Branch Staff Portal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="surface-card flex items-center gap-4 p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-2xl font-bold font-display leading-none">{value.toLocaleString()}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

function Dashboard() {
  const { data: stats, isLoading } = useQuery(statsQuery);

  if (isLoading || !stats) {
    return (
      <section aria-busy="true">
        <h1 className="text-2xl font-display">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Loading statistics…</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">DSTVEB Umutu — application overview</p>
        </div>
        <Link
          to="/admin/applicants"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <ClipboardList className="size-4" aria-hidden="true" /> View applicants
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total applications" value={stats.total} />
        <StatCard icon={CalendarDays} label="This year" value={stats.this_year} />
        <StatCard icon={Hourglass} label="Pending review" value={stats.pending} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-6">
          <h2 className="flex items-center gap-2 font-display text-base">
            <CalendarDays className="size-4 text-primary" aria-hidden="true" /> Applications per year
          </h2>
          {stats.per_year.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {stats.per_year.map((y) => {
                const max = Math.max(...stats.per_year.map((x) => x.count), 1);
                return (
                  <li key={y.year} className="flex items-center gap-3">
                    <span className="w-16 text-sm font-medium">{y.year}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(4, (y.count / max) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-semibold">{y.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="surface-card p-6">
          <h2 className="flex items-center gap-2 font-display text-base">
            <PieChart className="size-4 text-primary" aria-hidden="true" /> Applications per unit
          </h2>
          {stats.per_unit.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {stats.per_unit.slice(0, 8).map((u) => {
                const max = Math.max(...stats.per_unit.map((x) => x.count), 1);
                return (
                  <li key={u.unit_name} className="flex items-center gap-3">
                    <span className="w-40 truncate text-sm">{u.unit_name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(4, (u.count / max) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-semibold">{u.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="surface-card p-6">
          <h2 className="flex items-center gap-2 font-display text-base">
            <ClipboardCheck className="size-4 text-primary" aria-hidden="true" /> Status breakdown
          </h2>
          <ul className="mt-5 space-y-3">
            {stats.by_status.map((s) => {
              const pct = stats.total ? Math.round((s.count / stats.total) * 100) : 0;
              return (
                <li key={s.status} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-sm capitalize">
                    {s.status.replace(/_/g, " ")}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent-foreground"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-semibold">
                    {s.count} · {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="surface-card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-base">
          <Activity className="size-4 text-primary" aria-hidden="true" /> Recent applications
        </h2>
        {stats.recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No recent applications.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Application #</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Unit</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-4 font-mono text-xs">{r.application_number}</td>
                    <td className="py-3 pr-4 font-medium">{r.full_name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{r.unit_name}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs capitalize">
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{dateLabel(r.created_at)}</td>
                    <td className="py-3">
                      <Link
                        to="/admin/applicants/$id"
                        params={{ id: r.id }}
                        className="text-sm font-semibold text-primary-foreground underline underline-offset-4"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
