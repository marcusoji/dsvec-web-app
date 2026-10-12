import type { StudentRow } from "@/lib/school.functions";
import { resolveSubjectNames, splitMarks } from "@/lib/subjects";
import { PrintLogo } from "@/components/site/print-logo";
import { printedOn, type SheetKind } from "@/lib/print-sheets";
import { SITE } from "@/lib/site";

/**
 * The official printouts the branch issues to a trade unit:
 *
 *  - `contact` — a name / application number / phone number list;
 *  - `scores`  — a scoresheet with name, application number and blank subject
 *    boxes for the assessor to complete by hand.
 *
 * They render on screen too, via the `print-sheet` utility, so staff can check
 * the roster before sending it to the printer.
 */

function header(kind: SheetKind, heading: string) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div className="flex items-center gap-4">
        <PrintLogo />
        <div>
          <h2 className="font-display text-lg font-bold leading-tight">{heading}</h2>
          <p className="text-sm font-medium">{SITE.campusName}</p>
          <p className="text-xs text-muted-foreground">{SITE.name}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide">Official document</span>
        <span>Printed {printedOn()}</span>
        {kind === "scores" ? <span>Assessor's copy</span> : null}
      </div>
    </header>
  );
}

function SignatureRow() {
  return (
    <div className="mt-10 flex justify-between gap-8 text-xs text-muted-foreground">
      <span className="border-t border-border pt-1">Coordinator's signature</span>
      <span className="border-t border-border pt-1">Centre stamp / date</span>
    </div>
  );
}

export function StudentContactSheet({ rows, heading }: { rows: StudentRow[]; heading: string }) {
  return (
    <article data-sheet="contact" className="print-sheet surface-card overflow-hidden bg-paper">
      {header("contact", "Student contact list")}
      <div className="border-b border-border px-6 py-3 text-sm">
        <p className="font-semibold">{heading}</p>
        <p className="text-xs text-muted-foreground">
          Name, application number and phone number of admitted students.
        </p>
      </div>
      <div className="px-6 py-5">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">S/N</th>
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Application number</th>
              <th className="py-2 font-medium">Phone number</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, index) => (
              <tr key={r.id} className="print-avoid-break">
                <td className="py-2.5 pr-3 text-muted-foreground">{index + 1}</td>
                <td className="py-2.5 pr-3 font-medium">{r.full_name}</td>
                <td className="py-2.5 pr-3 font-mono text-xs">{r.application_number}</td>
                <td className="py-2.5">{r.phone || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
        <p>
          {rows.length} admitted student{rows.length === 1 ? "" : "s"} · {heading}
        </p>
      </footer>
    </article>
  );
}

export function StudentScoreSheet({ rows, heading }: { rows: StudentRow[]; heading: string }) {
  // A roster can span several units when an administrator prints "all
  // departments"; each unit is assessed on its own subjects, so each gets its
  // own table with its own column headings and split.
  const groups = new Map<
    string,
    { name: string; count: number; names: string[]; rows: StudentRow[] }
  >();
  for (const row of rows) {
    const group = groups.get(row.unit_id) ?? {
      name: row.unit_name,
      count: row.subject_count,
      names: row.subject_names,
      rows: [],
    };
    group.rows.push(row);
    groups.set(row.unit_id, group);
  }

  return (
    <article data-sheet="scores" className="print-sheet surface-card overflow-hidden bg-paper">
      {header("scores", "Assessment scoresheet")}
      <div className="border-b border-border px-6 py-3 text-sm">
        <p className="font-semibold">{heading}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Write each student's marks in the blank boxes. The 100-mark total is divided evenly across
          the subjects each unit assesses.
        </p>
      </div>
      {[...groups.values()].map((group) => {
        const caps = splitMarks(group.count);
        const names = resolveSubjectNames(group.names, group.count);
        return (
          <div key={group.name} className="px-6 py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-sm font-bold">{group.name}</h3>
              <p className="text-xs text-muted-foreground">
                {group.count} subject{group.count === 1 ? "" : "s"} — {caps.join(" / ")}
              </p>
            </div>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">S/N</th>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Application number</th>
                  {caps.map((cap, index) => (
                    <th key={index} className="py-2 pr-3 font-medium">
                      {names[index]} (/{cap})
                    </th>
                  ))}
                  <th className="py-2 font-medium">Total (/100)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {group.rows.map((r, index) => (
                  <tr key={r.id} className="print-avoid-break">
                    <td className="py-2.5 pr-3 text-muted-foreground">{index + 1}</td>
                    <td className="py-2.5 pr-3 font-medium">{r.full_name}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{r.application_number}</td>
                    {caps.map((_, slot) => (
                      <td key={slot} className="py-2.5 pr-3">
                        <span className="score-box block w-14" aria-hidden="true" />
                      </td>
                    ))}
                    <td className="py-2.5">
                      <span className="score-box block w-16" aria-hidden="true" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <footer className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
        {rows.length} admitted student{rows.length === 1 ? "" : "s"} · {heading}
        <SignatureRow />
      </footer>
    </article>
  );
}
