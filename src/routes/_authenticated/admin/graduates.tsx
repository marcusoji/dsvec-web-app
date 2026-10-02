import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";

import { listApplicants } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/graduates")({
  head: () => ({
    meta: [
      { title: "Graduates | DSTVEB Umutu Branch Staff Portal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Graduates,
});

function Graduates() {
  const { data, isLoading } = useQuery({
    queryKey: ["graduates"],
    queryFn: () =>
      listApplicants({ data: { page: 1, per_page: 100, status: "graduated", sort: "name_asc" } }),
  });

  return (
    <section>
      <h1 className="text-2xl font-display">Graduates</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Students who have completed their programme. They no longer appear on the class roster and
        stay here until the storage clean-up.
      </p>
      <div className="surface-card mt-6 overflow-hidden">
        {isLoading ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Loading graduates…</p>
        ) : !data?.rows.length ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <GraduationCap className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No graduates yet</p>
            <p className="text-sm text-muted-foreground">
              Set an applicant's status to "graduated" to move them here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-border bg-secondary/60">
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Application #</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Stream</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-mono text-xs">{r.application_number}</td>
                    <td className="px-4 py-3 font-medium">{r.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.unit_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.stream === "2" ? "Stream 2" : "Stream 1"} ·{" "}
                      {new Date(r.created_at).getFullYear()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/admin/applicants/$id"
                        params={{ id: r.id }}
                        className="text-sm font-semibold underline underline-offset-4"
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
      </div>
    </section>
  );
}
