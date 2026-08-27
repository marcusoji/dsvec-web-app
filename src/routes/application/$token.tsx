import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getApplicationByToken } from "@/lib/applicants.functions";
import { SITE } from "@/lib/site";

const DESCRIPTION =
  "Printable application form for the DSTVEB Umutu Branch. Download and print your official application form for submission at the campus.";

export const Route = createFileRoute("/application/$token")({
  loader: async ({ params }) => {
    const application = await getApplicationByToken({ data: { token: params.token } });
    if (!application) throw notFound();
    return application;
  },
  head: () => ({
    meta: [
      { title: "Download Application Form | DSTVEB Umutu Branch" },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Download Application Form | DSTVEB Umutu Branch" },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: ApplicationForm,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background px-4 py-20">
      <div className="surface-card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl">Invalid application link</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We could not find an application for this link. It may have expired or been mistyped.
        </p>
        <Link
          to="/apply"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Return to application
        </Link>
      </div>
    </div>
  ),
});

/** "Africa/Lagos" timezone formatting for the printed date. */
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function ApplicationForm() {
  const application = Route.useLoaderData();
  const fullName = [application.first_name, application.middle_name, application.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const print = () => window.print();

  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-10">
      <div className="mx-auto max-w-[210mm]">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Application form</p>
            <h1 className="mt-1 text-2xl md:text-3xl">
              Download &amp; print your application form
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Print this form and submit it at the campus. Staple a recent passport photograph where
              indicated if you did not upload one online.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={print}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Print / Save as PDF
            </button>
            <Link
              to="/apply"
              className="inline-flex items-center justify-center rounded-md border border-border-strong bg-background px-5 py-3 text-sm font-semibold"
            >
              Back to application
            </Link>
          </div>
        </div>

        {/* A4 printable sheet */}
        <article className="print-sheet surface-card overflow-hidden bg-paper">
          <header className="flex items-start justify-between gap-4 border-b border-border px-8 py-6 print-avoid-break">
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-md bg-ink text-ink-foreground">
                <span className="font-display text-sm font-black tracking-tight">DSTVEB</span>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold leading-tight">Application Form</h2>
                <p className="text-sm font-medium text-foreground">{SITE.campusName}</p>
                <p className="text-xs text-muted-foreground">{SITE.name}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wide">
                Official Document — one application per applicant
              </span>
              <span>{SITE.address}</span>
            </div>
          </header>

          <div className="border-b border-border px-8 py-6 print-avoid-break">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <dl className="grid flex-1 gap-x-10 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    Application number
                  </dt>
                  <dd className="mt-0.5 font-display text-xl font-black tracking-tight">
                    {application.application_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    Date of application
                  </dt>
                  <dd className="mt-0.5 font-medium">{formatDate(application.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    Apply-to centre
                  </dt>
                  <dd className="mt-0.5 font-medium">{SITE.campusName}</dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    Status
                  </dt>
                  <dd className="mt-0.5 font-medium capitalize">
                    {application.status.replace(/_/g, " ")}
                  </dd>
                </div>
              </dl>
              <div className="shrink-0 text-center">
                <div className="grid h-40 w-32 place-items-center overflow-hidden rounded-md border border-border bg-secondary">
                  {application.photo_url ? (
                    <img
                      src={application.photo_url}
                      alt="Applicant passport photograph"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-2 text-center text-[0.65rem] text-muted-foreground">
                      Passport photograph (to be provided at screening)
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
                  Passport photograph
                </p>
              </div>
            </div>
          </div>

          <section className="px-8 py-6">
            <h2 className="border-b border-border pb-2 font-display text-sm font-bold uppercase tracking-wide">
              Section A — Applicant particulars
            </h2>
            <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              {[
                ["Full name", fullName],
                ["Gender", application.gender],
                ["Date of birth", formatDate(application.date_of_birth)],
                ["Nationality", application.nationality],
                ["State of origin", application.state],
                ["Local government area", application.local_government],
                ["Residential address", application.address],
                ["Email address", application.email],
                ["Phone number", application.phone],
              ].map(([k, v]) => (
                <div key={k} className="print-avoid-break">
                  <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    {k}
                  </dt>
                  <dd className="mt-0.5 font-medium">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="border-t border-border px-8 py-6 print-avoid-break">
            <h2 className="border-b border-border pb-2 font-display text-sm font-bold uppercase tracking-wide">
              Section B — Programme of study
            </h2>
            <div className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                  Trade unit applied for
                </dt>
                <dd className="mt-0.5 font-medium">{application.unit_name}</dd>
              </div>
              <div>
                <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                  Programme
                </dt>
                <dd className="mt-0.5 font-medium">Vocational Certificate</dd>
              </div>
              <div>
                <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                  Duration
                </dt>
                <dd className="mt-0.5 font-medium">6 months</dd>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Intake and commencement dates are confirmed by the admissions office. Candidates must
              complete the full six-month practical programme and a final trade assessment to be
              certified.
            </p>
          </section>

          <section className="border-t border-border px-8 py-6 print-avoid-break">
            <h2 className="border-b border-border pb-2 font-display text-sm font-bold uppercase tracking-wide">
              Section C — Parent / guardian &amp; emergency contact
            </h2>
            <p className="mt-3 text-xs text-muted-foreground">
              Complete for all applicants. Mandatory for applicants under 18 years of age.
            </p>
            <div className="mt-5 grid gap-x-10 gap-y-6 text-sm sm:grid-cols-2">
              {[
                "Parent / guardian full name",
                "Relationship to applicant",
                "Parent / guardian phone number",
                "Emergency contact name &amp; number",
              ].map((label) => (
                <div key={label}>
                  <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-4 border-b border-dashed border-border print:border-ink" />
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-border px-8 py-6 print-avoid-break">
            <h2 className="border-b border-border pb-2 font-display text-sm font-bold uppercase tracking-wide">
              Section D — Educational background
            </h2>
            <p className="mt-3 text-xs text-muted-foreground">
              State your highest level of education completed and any prior vocational training.
            </p>
            <div className="mt-5 grid gap-x-10 gap-y-6 text-sm sm:grid-cols-2">
              {[
                "Most recent school / institution",
                "Qualification obtained",
                "Year last attended / completed",
                "Any prior vocational training",
              ].map((label) => (
                <div key={label}>
                  <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-4 border-b border-dashed border-border print:border-ink" />
                </div>
              ))}
            </div>
          </section>

          <section className="px-8 py-6 print-avoid-break">
            <h2 className="border-b border-border pb-2 font-display text-sm font-bold uppercase tracking-wide">
              Section E — Declaration
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
              <li>
                I declare that all the information provided in this application form is true and
                correct to the best of my knowledge.
              </li>
              <li>
                I understand that providing false information or forged documents will lead to the
                automatic cancellation of my application or admission.
              </li>
              <li>
                I agree to abide by the rules, regulations and code of conduct of the{" "}
                {SITE.campusName}.
              </li>
              <li>
                I confirm that I will personally attend the programme, and my admission is not
                transferable.
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Where the applicant is under 18 years of age, the form must also be signed by a parent
              or legal guardian.
            </p>
            <div className="mt-12 grid gap-10 text-sm sm:grid-cols-3 print-avoid-break">
              <div>
                <p className="font-medium">Applicant's signature</p>
                <div className="mt-10 border-b border-ink print:border-ink" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">Parent / guardian (if under 18)</p>
                <div className="mt-10 border-b border-ink print:border-ink" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">Date</p>
                <div className="mt-10 border-b border-ink print:border-ink" aria-hidden="true" />
              </div>
            </div>
          </section>

          <footer className="border-t border-ink bg-secondary/40 px-8 py-6 print-avoid-break">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Section F — For office use only
            </h3>
            <div className="mt-3 grid gap-x-8 gap-y-4 text-xs text-muted-foreground">
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
                <span>Photograph verified:&nbsp;____________</span>
                <span>Original documents sighted:&nbsp;____________</span>
                <span>Date received:&nbsp;____________</span>
              </div>
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
                <span>Preliminary verification:&nbsp;____________</span>
                <span>Fee/registration confirmed:&nbsp;____________</span>
                <span>Admissions officer:&nbsp;____________</span>
              </div>
            </div>
            <p className="mt-4 text-[0.68rem] text-muted-foreground">
              {SITE.name} — {SITE.branch}. This form is a valid application record for the{" "}
              {SITE.campusName}.
            </p>
          </footer>
        </article>

        <p className="no-print mt-6 text-center text-sm text-muted-foreground">
          Keep this form once printed. Quote your application number in all correspondence with the
          admissions office.
        </p>
      </div>
    </div>
  );
}
