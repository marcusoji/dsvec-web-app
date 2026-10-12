import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileText, ImageIcon, Loader2, Save } from "lucide-react";

import {
  getApplicantDetail,
  STATUSES,
  updateApplicationStatus,
  type ApplicationStatus,
} from "@/lib/admin.functions";
import { AdmissionLetter, AdmissionLetterDialog } from "@/components/site/admission-letter";

export const Route = createFileRoute("/_authenticated/admin/applicants/$id")({
  loader: async ({ params }) => {
    const detail = await getApplicantDetail({ data: { id: params.id } });
    if (!detail) throw notFound();
    return detail;
  },
  head: () => ({
    meta: [
      {
        title: "Applicant | DSTVEB Umutu Staff Portal",
        name: "robots",
        content: "noindex, nofollow",
      },
    ],
  }),
  component: ApplicantDetail,
  notFoundComponent: () => (
    <div>
      <h1 className="text-2xl font-display">Applicant not found</h1>
      <Link
        to="/admin/applicants"
        className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
      >
        Back to applicants
      </Link>
    </div>
  ),
});

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

function ApplicantDetail() {
  const detail = Route.useLoaderData();
  const [status, setStatus] = useState<ApplicationStatus>(detail.status);
  const [notes, setNotes] = useState(detail.admin_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const letterData = {
    fullName: detail.full_name,
    applicationNumber: detail.application_number,
    unitName: detail.unit_name,
    stream: detail.stream,
    address: detail.address,
  };

  async function save() {
    setSaving(true);
    try {
      await updateApplicationStatus({
        data: { id: detail.id, status, notes: notes.trim() || undefined },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <Link
        to="/admin/applicants"
        className="no-print inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline underline-offset-4"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to applicants
      </Link>

      <div className="no-print mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-24 w-20 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-secondary">
            {detail.photo_url ? (
              <img
                src={detail.photo_url}
                alt="Applicant photograph"
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-display">{detail.full_name}</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {detail.application_number}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Applied {dateLabel(detail.created_at)} · {detail.unit_name}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex rounded-full border border-border bg-accent/40 px-3 py-1 text-sm capitalize">
            {detail.status.replace(/_/g, " ")}
          </span>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {detail.access_token ? (
              <Link
                to="/application/$token"
                params={{ token: detail.access_token }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
              >
                <FileText className="size-4" aria-hidden="true" /> View printable form
              </Link>
            ) : null}
            {detail.status === "admitted" ? <AdmissionLetterDialog data={letterData} /> : null}
          </div>
        </div>
      </div>

      <div className="no-print mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="surface-card p-6">
          <h2 className="font-display text-base">Personal &amp; contact</h2>
          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <DetailRow label="Gender" value={detail.gender} />
            <DetailRow label="Date of birth" value={dateLabel(detail.date_of_birth)} />
            <DetailRow label="Nationality" value={detail.nationality} />
            <DetailRow label="State of origin" value={detail.state} />
            <DetailRow label="Local government" value={detail.local_government} />
            <DetailRow label="Email" value={detail.email} />
            <DetailRow label="Phone" value={detail.phone} />
            <DetailRow label="Residential address" value={detail.address} />
          </dl>
        </section>

        <section className="surface-card h-fit p-6">
          <h2 className="font-display text-base">Update application</h2>
          <label htmlFor="detail-status" className="mt-4 block text-sm font-medium">
            Status
          </label>
          <select
            id="detail-status"
            className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          >
            {!(STATUSES as readonly string[]).includes(detail.status) ? (
              <option value={detail.status}>{detail.status.replace(/_/g, " ")} (retired)</option>
            ) : null}
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <label htmlFor="detail-notes" className="mt-4 block text-sm font-medium">
            Administrative notes
          </label>
          <textarea
            id="detail-notes"
            rows={4}
            className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes — visible to staff only."
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </button>
        </section>
      </div>

      {/* Admission letters live here, outside the `no-print` content above, so
          the page's print CSS can drop the portal chrome and print only the
          letter. Kept mounted so `window.print()` is synchronous. */}
      {detail.status === "admitted" ? (
        <div className="print-only hidden">
          <AdmissionLetter data={letterData} />
        </div>
      ) : null}
    </section>
  );
}
