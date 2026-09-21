import type { StudentRow } from "@/lib/school.functions";
import { printedOn, type SheetKind } from "@/lib/print-sheets";
import { SITE } from "@/lib/site";

/**
 * The two official printouts the branch issues to a trade unit:
 *
 *  - `contact` — a name / application number / phone number list;
 *  - `scores`  — a scoresheet with name, application number and blank C.A. and
 *    examination boxes for the assessor to complete by hand.
 *
 * They render on screen too, via the `print-sheet` utility, so staff can check
 * the roster before sending it to the printer.
 */

function header(kind: SheetKind, heading: string) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-md bg-ink text-ink-foreground">
          <span className="font-display text-sm font-black tracking-tight">DSTVEB</span>
        </div>
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
  return (
    <article data-sheet="scores" className="print-sheet surface-card overflow-hidden bg-paper">
      {header("scores", "Assessment scoresheet")}
      <div className="border-b border-border px-6 py-3 text-sm">
        <dl className="flex flex-wrap gap-x-10 gap-y-2">
          <div>
            <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              Trade unit
            </dt>
            <dd className="mt-0.5 font-medium">{heading}</dd>
          </div>
          <div>
            <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              Continuous assessment
            </dt>
            <dd className="mt-0.5 font-medium">Maximum 40 marks</dd>
          </div>
          <div>
            <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              Examination
            </dt>
            <dd className="mt-0.5 font-medium">Maximum 60 marks</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          Write each student's marks in the blank boxes. Total is over 100.
        </p>
      </div>
      <div className="px-6 py-5">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">S/N</th>
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Application number</th>
              <th className="py-2 pr-3 font-medium">C.A. (/40)</th>
              <th className="py-2 pr-3 font-medium">Exam (/60)</th>
              <th className="py-2 font-medium">Total (/100)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, index) => (
              <tr key={r.id} className="print-avoid-break">
                <td className="py-2.5 pr-3 text-muted-foreground">{index + 1}</td>
                <td className="py-2.5 pr-3 font-medium">{r.full_name}</td>
                <td className="py-2.5 pr-3 font-mono text-xs">{r.application_number}</td>
                <td className="py-2.5 pr-3">
                  <span className="score-box block w-16" aria-hidden="true" />
                </td>
                <td className="py-2.5 pr-3">
                  <span className="score-box block w-16" aria-hidden="true" />
                </td>
                <td className="py-2.5">
                  <span className="score-box block w-16" aria-hidden="true" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
        {rows.length} admitted student{rows.length === 1 ? "" : "s"} · {heading}
        <SignatureRow />
      </footer>
    </article>
  );
}
