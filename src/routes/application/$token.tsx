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
              <div className="grid h-40 w-32 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-secondary">
                {application.photo_url ? (
                  <img
                    src={application.photo_url}
                    alt="Applicant photograph"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="px-2 text-center text-[0.65rem] text-muted-foreground">
                    Photograph (to be provided at screening)
                  </span>
                )}
              </div>
            </div>
          </div>

          <section className="px-8 py-6">
            <h2 className="border-b border-border pb-2 font-display text-sm font-bold uppercase tracking-wide">
              Applicant particulars
            </h2>
            <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              {[
                ["Full name", fullName],
                ["Gender", application.gender],
                ["Date of birth", formatDate(application.date_of_birth)],
                ["Nationality", application.nationality],
                ["Email address", application.email],
                ["Phone number", application.phone],
                ["Residential address", application.address],
                ["State of origin", application.state],
                ["Local government area", application.local_government],
                ["Selected unit", application.unit_name],
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

          <section className="px-8 py-6 print-avoid-break">
            <h2 className="border-b border-border pb-2 font-display text-sm font-semibold uppercase tracking-wide">
              Declaration
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-foreground">
              I hereby declare that the information provided in this application form is true and
              correct to the best of my knowledge. I understand that any false information may lead
              to the cancellation of my application or admission.
            </p>
            <div className="mt-12 grid gap-10 text-sm sm:grid-cols-2 print-avoid-break">
              <div>
                <p className="font-medium">Signature</p>
                <div className="mt-10 border-b border-ink print:border-ink" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">Date</p>
                <div className="mt-10 border-b border-ink print:border-ink" aria-hidden="true" />
              </div>
            </div>
          </section>

          <footer className="border-t border-border bg-secondary/40 px-8 py-6 print-avoid-break">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              For office use only
            </h3>
            <div className="mt-3 grid gap-6 text-xs text-muted-foreground sm:grid-cols-3">
              <span>Preliminary verification:&nbsp;____________</span>
              <span>Photograph verified:&nbsp;____________</span>
              <span>Admissions officer:&nbsp;____________</span>
            </div>
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
