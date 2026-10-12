import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Printer, Save, ShieldCheck } from "lucide-react";

import {
  getStudent,
  saveScores,
  setUnitSubjectCount,
  type StudentDetail,
} from "@/lib/school.functions";
import { MAX_SUBJECTS, MIN_SUBJECTS, splitMarks, TOTAL_MARKS } from "@/lib/subjects";
import { PrintLogo } from "@/components/site/print-logo";
import { SITE } from "@/lib/site";
import { useAdminUser } from "@/lib/use-admin-user";

export const Route = createFileRoute("/_authenticated/admin/students/$id/scoresheet")({
  loader: async ({ params }) => {
    const student = await getStudent({ data: { id: params.id } });
    if (!student) throw notFound();
    return student;
  },
  head: () => ({
    meta: [
      { title: "Scoresheet | DSTVEB Umutu Branch Staff Portal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ScoresheetPage,
  notFoundComponent: () => (
    <section className="surface-card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-display">Student not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This student is not admitted, or belongs to another department.
      </p>
      <Link
        to="/admin/students"
        className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
      >
        Back to students
      </Link>
    </section>
  ),
});

/** Grades follow the usual Nigerian vocational assessment bands. */
function gradeFor(total: number | null) {
  if (total === null) return "—";
  if (total >= 70) return "A — Distinction";
  if (total >= 60) return "B — Credit";
  if (total >= 50) return "C — Pass";
  if (total >= 40) return "D — Fair";
  return "F — Fail";
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function parseScore(raw: string, max: number): { value: number | null; error: string | null } {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, error: null };
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return { value: null, error: "Enter a number" };
  if (parsed < 0 || parsed > max) return { value: null, error: `Must be between 0 and ${max}` };
  return { value: parsed, error: null };
}

/** Grows or shrinks the marks array while keeping what has been typed so far. */
function resize(values: string[], count: number): string[] {
  return Array.from({ length: count }, (_, i) => values[i] ?? "");
}

function ScoresheetPage() {
  const student = Route.useLoaderData() as StudentDetail;
  const router = useRouter();
  const { hasPermission } = useAdminUser();
  const canWrite = hasPermission("scores.write");

  const [subjectCount, setSubjectCount] = useState(student.subject_count);
  const [subjects, setSubjects] = useState<string[]>(() =>
    resize(
      (student.subjects ?? []).map((s) => (s === null ? "" : String(s))),
      student.subject_count,
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(student.updated_at);
  const [countBusy, setCountBusy] = useState(false);
  const [countSaved, setCountSaved] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-hide-badge", "");
    return () => document.documentElement.removeAttribute("data-hide-badge");
  }, []);

  const caps = useMemo(() => splitMarks(subjectCount), [subjectCount]);
  const results = subjects.map((raw, i) => parseScore(raw, caps[i] ?? 0));
  const validationError = results.find((r) => r.error)?.error ?? null;
  const values = results.map((r) => (r.error ? null : r.value));
  const anyValue = values.some((v) => v !== null);
  const total = anyValue ? values.reduce<number>((sum, v) => sum + Number(v ?? 0), 0) : null;

  function changeSubjectCount(next: number) {
    setSubjectCount(next);
    setSubjects((prev) => resize(prev, next));
  }

  async function applySubjectCount() {
    setCountBusy(true);
    setError(null);
    try {
      await setUnitSubjectCount({
        data: { unit_id: student.unit_id, subject_count: subjectCount },
      });
      setCountSaved(true);
      setTimeout(() => setCountSaved(false), 2500);
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the subject count.");
    } finally {
      setCountBusy(false);
    }
  }

  async function save() {
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveScores({
        data: { entries: [{ applicant_id: student.id, subjects: values }] },
      });
      setSaved(true);
      setSavedAt(new Date().toISOString());
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the scores.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-[210mm]">
      <div className="no-print">
        <Link
          to="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline underline-offset-4"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to students
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display">Scoresheet</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a mark for each of the {subjectCount} subject(s) this unit assesses, then print
              or save the sheet as a PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-paper px-4 py-2 text-sm font-semibold"
          >
            <Printer className="size-4" aria-hidden="true" /> Print / Save as PDF
          </button>
        </div>

        {canWrite ? (
          <div className="surface-card mt-6 p-5">
            {error ? (
              <p
                role="alert"
                className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-end gap-3 border-b border-border pb-5">
              <label htmlFor="subject-count" className="text-sm font-medium">
                Subjects this unit assesses
                <select
                  id="subject-count"
                  value={subjectCount}
                  onChange={(e) => changeSubjectCount(Number(e.target.value))}
                  className="mt-1.5 block h-10 w-40 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {Array.from(
                    { length: MAX_SUBJECTS - MIN_SUBJECTS + 1 },
                    (_, i) => MIN_SUBJECTS + i,
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n} subject{n === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={applySubjectCount}
                disabled={countBusy || subjectCount === student.subject_count}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border-strong bg-paper px-4 text-sm font-semibold disabled:opacity-60"
              >
                {countBusy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Save subject count
              </button>
              {countSaved ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <CheckCircle2 className="size-4" aria-hidden="true" /> Unit updated
                </span>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {TOTAL_MARKS} marks are divided evenly: {caps.join(" / ")}.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {caps.map((cap, index) => (
                <ScoreInput
                  key={index}
                  id={`subject-${index}`}
                  label={`Subject ${index + 1} (max ${cap})`}
                  value={subjects[index] ?? ""}
                  onChange={(value) =>
                    setSubjects((prev) => prev.map((v, i) => (i === index ? value : v)))
                  }
                  max={cap}
                  error={results[index]?.error ?? null}
                />
              ))}
              <div className="text-sm font-medium">
                Total
                <p className="mt-1.5 flex h-10 items-center rounded-md border border-input bg-secondary/50 px-3 text-base font-bold">
                  {total === null ? "—" : total} / {TOTAL_MARKS}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={busy || Boolean(validationError)}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                {busy ? "Saving…" : "Save scores"}
              </button>
              {saved ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <CheckCircle2 className="size-4" aria-hidden="true" /> Scores saved
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-6 flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden="true" /> You have read-only access to
            scores.
          </p>
        )}
      </div>

      {/* A4 printable scoresheet */}
      <article className="print-sheet surface-card mt-6 overflow-hidden bg-paper">
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            <PrintLogo />
            <div>
              <h2 className="font-display text-lg font-bold leading-tight">
                Assessment Scoresheet
              </h2>
              <p className="text-sm font-medium">{SITE.campusName}</p>
              <p className="text-xs text-muted-foreground">{SITE.name}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide">Official document</span>
            <span>Printed {formatDay(new Date().toISOString())}</span>
          </div>
        </header>

        <div className="border-b border-border px-6 py-4">
          <dl className="grid gap-x-10 gap-y-3 text-sm sm:grid-cols-2">
            <Field label="Full name" value={student.full_name} />
            <Field label="Application number" value={student.application_number} mono />
            <Field label="Trade unit" value={student.unit_name} />
            <Field
              label="Stream"
              value={
                student.stream === "2" ? "Stream 2 (July–December)" : "Stream 1 (January–June)"
              }
            />
            <Field label="Phone" value={student.phone} />
            <Field label="Email" value={student.email} />
            <Field label="Gender" value={student.gender} />
            <Field label="Date of birth" value={formatDay(student.date_of_birth)} />
            <Field label="Admitted on" value={formatDay(student.created_at)} />
          </dl>
        </div>

        <div className="px-6 py-5">
          <p className="mb-2 text-xs text-muted-foreground">
            {subjectCount} subject{subjectCount === 1 ? "" : "s"}, {TOTAL_MARKS} marks in total —
            divided {caps.join(" / ")}. Write the marks in the blank boxes.
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Subject</th>
                <th className="py-2 pr-4 font-medium">Maximum</th>
                <th className="py-2 font-medium">Score obtained</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {caps.map((cap, index) => (
                <tr key={index}>
                  <td className="py-3 pr-4 font-medium">Subject {index + 1}</td>
                  <td className="py-3 pr-4">{cap}</td>
                  <td className="py-3">
                    <span className="score-box block w-24" aria-hidden="true" />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-3 pr-4 font-bold">Total</td>
                <td className="py-3 pr-4 font-bold">{TOTAL_MARKS}</td>
                <td className="py-3">
                  <span className="score-box block w-24" aria-hidden="true" />
                </td>
              </tr>
            </tbody>
          </table>
          {total !== null ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Recorded in the portal:{" "}
              {values.map((v, i) => `S${i + 1} ${v ?? "—"}/${caps[i]}`).join(", ")} — total {total}{" "}
              — {gradeFor(total)}.
            </p>
          ) : null}
        </div>

        <div className="border-t border-border px-6 py-4">
          <div className="flex flex-wrap items-end justify-between gap-8 text-sm">
            <div>
              <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                Recorded by
              </p>
              <p className="mt-0.5 font-medium">{student.unit_name} unit staff</p>
            </div>
            <div className="text-right">
              <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                Last updated
              </p>
              <p className="mt-0.5 font-medium">
                {savedAt ? formatDay(savedAt) : "Not yet recorded"}
              </p>
            </div>
          </div>
          <div className="mt-10 flex justify-between gap-8 text-xs text-muted-foreground">
            <span className="border-t border-border pt-1">Assessor's signature</span>
            <span className="border-t border-border pt-1">Coordinator's signature</span>
            <span className="border-t border-border pt-1">Centre stamp / date</span>
          </div>
        </div>
      </article>
    </section>
  );
}

function ScoreInput({
  id,
  label,
  value,
  onChange,
  max,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  error: string | null;
}) {
  return (
    <label htmlFor={id} className="text-sm font-medium">
      {label}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 font-medium ${mono ? "font-mono text-xs" : "text-sm"}`}>
        {value || "—"}
      </dd>
    </div>
  );
}
