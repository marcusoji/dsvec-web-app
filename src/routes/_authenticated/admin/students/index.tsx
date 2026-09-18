import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Printer, Search, ShieldCheck, Users } from "lucide-react";

import { listStudents, type StudentRow } from "@/lib/school.functions";
import { SITE } from "@/lib/site";
import { useAdminUser } from "@/lib/use-admin-user";

const DESCRIPTION =
  "Admitted students for a trade unit, with printable class lists and score sheets.";

export const Route = createFileRoute("/_authenticated/admin/students/")({
  head: () => ({
    meta: [
      { title: "Students | DSTVEB Umutu Branch Staff Portal" },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StudentsPage,
});

function scoreLabel(value: number | null) {
  return value === null ? "—" : String(value);
}

function printedOn() {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date());
}

function StudentsPage() {
  const { user, hasPermission, isLoading: loadingUser } = useAdminUser();
  const allowed = hasPermission("students.read");
  const [unitId, setUnitId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-students", unitId, search],
    queryFn: () =>
      listStudents({
        data: {
          ...(unitId ? { unit_id: unitId } : {}),
          ...(search ? { search } : {}),
        },
      }),
    enabled: allowed,
  });

  // Keep the official printouts clean of editor/platform overlays.
  useEffect(() => {
    document.documentElement.setAttribute("data-hide-badge", "");
    return () => document.documentElement.removeAttribute("data-hide-badge");
  }, []);

  if (loadingUser) {
    return <p className="text-sm text-muted-foreground">Checking your access…</p>;
  }
  if (!allowed) {
    return (
      <section className="surface-card p-8">
        <h1 className="flex items-center gap-2 text-xl font-display">
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" /> Students
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account cannot open the student register.
        </p>
      </section>
    );
  }

  const rows = data?.rows ?? [];
  const isAdmin = data?.isAdmin ?? false;

  if (!isAdmin && !user?.unitId) {
    return (
      <section className="surface-card p-8">
        <h1 className="text-2xl font-display">Students</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is not linked to a department yet. Ask an administrator to assign your unit
          before you can see students.
        </p>
      </section>
    );
  }

  const heading =
    data?.unit?.name ??
    (isAdmin && !unitId ? "All departments" : (user?.unitName ?? "Your department"));

  return (
    <section>
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-display">
            <Users className="size-5 text-primary" aria-hidden="true" /> Students
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admitted applicants in {heading}. Only admitted students appear here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-paper px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          <Printer className="size-4" aria-hidden="true" /> Print student list
        </button>
      </div>

      <div className="no-print surface-card mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_14rem_auto]">
          <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Search students</span>
            <input
              type="search"
              className="h-10 w-full bg-transparent text-sm outline-none"
              placeholder="Number or name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setSearch(searchInput.trim());
                }
              }}
            />
          </label>
          {isAdmin ? (
            <select
              aria-label="Filter by department"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All departments</option>
              {(data?.units ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="flex h-10 items-center rounded-md border border-input bg-secondary/50 px-3 text-sm">
              {data?.unit?.name ?? user?.unitName ?? "—"}
            </p>
          )}
          <button
            type="button"
            onClick={() => setSearch(searchInput.trim())}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Search
          </button>
        </div>
      </div>

      <div className="surface-card mt-4 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading students…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Users className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No admitted students yet</p>
            <p className="text-sm text-muted-foreground">
              Admit an applicant first, then they appear in this list.
            </p>
          </div>
        ) : (
          <>
            <div className="print-only hidden border-b border-border px-4 py-3">
              <p className="font-display text-base font-bold">Student list — {heading}</p>
              <p className="text-xs text-muted-foreground">
                {SITE.campusName} · printed {printedOn()}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead className="border-b border-border bg-secondary/60">
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">S/N</th>
                    <th className="px-4 py-3 font-medium">Application #</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Stream</th>
                    <th className="px-4 py-3 font-medium">Test (/40)</th>
                    <th className="px-4 py-3 font-medium">Exam (/60)</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="no-print px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r: StudentRow, index) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.application_number}</td>
                      <td className="px-4 py-3 font-medium">{r.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.unit_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.stream === "2" ? "Stream 2" : "Stream 1"}
                      </td>
                      <td className="px-4 py-3">{scoreLabel(r.test_score)}</td>
                      <td className="px-4 py-3">{scoreLabel(r.exam_score)}</td>
                      <td className="px-4 py-3 font-medium">{scoreLabel(r.total_score)}</td>
                      <td className="no-print px-4 py-3 text-right">
                        <Link
                          to="/admin/students/$id/scoresheet"
                          params={{ id: r.id }}
                          className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"
                        >
                          <CheckCircle2 className="size-3.5" aria-hidden="true" /> Scoresheet
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <p className="no-print mt-3 text-xs text-muted-foreground">
        Showing {rows.length} admitted student{rows.length === 1 ? "" : "s"}. Applicants appear here
        only after their status is set to <strong className="font-semibold">admitted</strong>.
      </p>
    </section>
  );
}
