import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Download, FileDown, FileText, Search, Users } from "lucide-react";

import {
  exportApplicantsCsv,
  listApplicants,
  STATUSES,
  type ApplicantSort,
  type ApplicationStatus,
} from "@/lib/admin.functions";
import { StaleApplicantsPrompt } from "@/components/site/stale-applicants-prompt";

const DESCRIPTION = "Browse, search, filter and export applications at the DSTVEB Umutu Branch.";

export const Route = createFileRoute("/_authenticated/admin/applicants/")({
  head: () => ({
    meta: [
      { title: "Applicants | DSTVEB Umutu Branch Staff Portal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Applicants,
});

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

function Applicants() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [unitId, setUnitId] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "">("");
  const [year, setYear] = useState<number | "">("");
  const [stream, setStream] = useState("");
  const [sort, setSort] = useState<ApplicantSort | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof listApplicants>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void run({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type Filters = {
    search: string;
    unit_id: string;
    status: ApplicationStatus | "";
    year: number | "";
    stream: string;
    sort: ApplicantSort | "";
  };

  /**
   * Overrides let a filter change be applied immediately: state updates are
   * async, so the handler passes the new value through instead of relying on
   * the next render's closure.
   */
  async function run(overrides?: Partial<Filters> & { page?: number }) {
    const next: Filters = {
      search,
      unit_id: unitId,
      status,
      year,
      stream,
      sort,
      ...overrides,
    };
    setLoading(true);
    try {
      const nextPage = overrides?.page ?? page;
      const res = await listApplicants({
        data: {
          page: nextPage,
          per_page: 20,
          search: next.search || undefined,
          unit_id: next.unit_id || undefined,
          status: next.status || undefined,
          year: next.year === "" ? undefined : next.year,
          stream: next.stream === "" ? undefined : (next.stream as "1" | "2"),
          sort: next.sort || undefined,
        },
      });
      setData(res);
      setPage(res.page);
    } finally {
      setLoading(false);
    }
  }

  function applySearch() {
    const value = searchInput.trim();
    setSearch(value);
    void run({ search: value, page: 1 });
  }

  function changeFilter(kind: "unit" | "status" | "year" | "stream", value: string) {
    if (kind === "unit") {
      setUnitId(value);
      void run({ unit_id: value, page: 1 });
    } else if (kind === "status") {
      const next = value as ApplicationStatus | "";
      setStatus(next);
      void run({ status: next, page: 1 });
    } else if (kind === "year") {
      const next = value === "" ? "" : Number(value);
      setYear(next);
      void run({ year: next, page: 1 });
    } else {
      setStream(value);
      void run({ stream: value, page: 1 });
    }
  }

  /** One button: first click sorts A→Z, the next flips to Z→A. */
  function toggleSort() {
    const next: ApplicantSort = sort === "name_asc" ? "name_desc" : "name_asc";
    setSort(next);
    void run({ sort: next, page: 1 });
  }

  async function doExport() {
    setExporting(true);
    try {
      const csv = await exportApplicantsCsv({
        data: {
          unit_id: unitId || undefined,
          status: status || undefined,
          year: year === "" ? undefined : year,
          stream: stream === "" ? undefined : (stream as "1" | "2"),
          sort: sort || undefined,
        },
      });
      // The server already writes a UTF-8 BOM; do not add a second one.
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dstveb-applicants-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display">Applicants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, filter, sort and export applications
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSort}
            disabled={loading || exporting}
            aria-pressed={sort !== ""}
            className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-paper px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {sort === "name_desc" ? (
              <ArrowUpAZ className="size-4" aria-hidden="true" />
            ) : (
              <ArrowDownAZ className="size-4" aria-hidden="true" />
            )}
            {sort === "name_asc"
              ? "Sorted A–Z"
              : sort === "name_desc"
                ? "Sorted Z–A"
                : "Sort alphabetically"}
          </button>
          <button
            type="button"
            onClick={doExport}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-paper px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {exporting ? <Download className="size-4 animate-pulse" aria-hidden="true" /> : null}
            {exporting ? "Preparing…" : "Export CSV"}
          </button>
        </div>
      </div>

      <StaleApplicantsPrompt onDeleted={() => void run()} />

      <div className="surface-card mt-6 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem_8rem_auto]">
          <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Search applicants</span>
            <input
              type="search"
              className="h-10 w-full bg-transparent text-sm outline-none"
              placeholder="Number, name, email or phone…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applySearch();
                }
              }}
            />
          </label>
          <select
            aria-label="Filter by unit"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={unitId}
            onChange={(e) => changeFilter("unit", e.target.value)}
          >
            <option value="">All units</option>
            {(data?.units ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={status}
            onChange={(e) => changeFilter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by year"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={year === "" ? "" : String(year)}
            onChange={(e) => changeFilter("year", e.target.value)}
          >
            <option value="">All years</option>
            {(data?.years ?? []).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by stream"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={stream}
            onChange={(e) => changeFilter("stream", e.target.value)}
          >
            <option value="">All streams</option>
            <option value="1">Stream 1 (January–June)</option>
            <option value="2">Stream 2 (July–December)</option>
          </select>
          <button
            type="button"
            onClick={applySearch}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Search
          </button>
        </div>
      </div>

      <div className="surface-card mt-4 overflow-hidden">
        {loading && !data ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading applicants…</div>
        ) : data && data.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Users className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No applicants match these filters</p>
            <p className="text-sm text-muted-foreground">Try clearing the search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-border bg-secondary/60">
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Application #</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Stream</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.rows.map((r) => (
                  <tr key={r.id} className={loading ? "opacity-60" : undefined}>
                    <td className="px-4 py-3 font-mono text-xs">{r.application_number}</td>
                    <td className="px-4 py-3 font-medium">{r.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.unit_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.stream === "2" ? "Stream 2" : "Stream 1"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-border bg-accent/40 px-2 py-0.5 text-xs capitalize">
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{dateLabel(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to="/admin/applicants/$id"
                          params={{ id: r.id }}
                          className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"
                        >
                          <FileDown className="size-3.5" aria-hidden="true" /> View
                        </Link>
                        {r.access_token ? (
                          <Link
                            to="/application/$token"
                            params={{ token: r.access_token }}
                            className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"
                          >
                            <FileText className="size-3.5" aria-hidden="true" /> Form
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pages > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-4 flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-muted-foreground">
            Showing {(data.page - 1) * data.per_page + 1}–
            {Math.min(data.page * data.per_page, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => void run({ page: data.page - 1 })}
              className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={data.page >= data.pages}
              onClick={() => void run({ page: data.page + 1 })}
              className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
