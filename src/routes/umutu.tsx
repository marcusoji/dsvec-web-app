import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, CalendarDays, FileText, Users, Wrench } from "lucide-react";

import { SiteShell } from "@/components/site/site-shell";
import { listUnits } from "@/lib/units.functions";
import { SITE } from "@/lib/site";

const unitsQuery = queryOptions({ queryKey: ["units"], queryFn: () => listUnits() });

export const Route = createFileRoute("/umutu")({
  head: () => ({
    meta: [
      { title: "DSTVEB Umutu Branch — Technical & Vocational Training, Delta State" },
      { name: "description", content: SITE.description },
      { property: "og:title", content: "DSTVEB Umutu Branch — Technical & Vocational Training" },
      { property: "og:description", content: SITE.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(unitsQuery),
  component: UmutuHome,
});

const STATS = [
  { icon: Wrench, value: "10+", label: "Trade units" },
  { icon: Users, value: "500+", label: "Trainees supported" },
  { icon: BadgeCheck, value: "100%", label: "Practical assessment" },
  { icon: CalendarDays, value: "6", label: "Months per programme" },
];

const STEPS = [
  { title: "Choose a unit", body: "Browse the trade units and confirm the entry requirements." },
  {
    title: "Complete the form",
    body: "Fill your details online and upload a passport photograph.",
  },
  {
    title: "Get your number",
    body: "An application number is generated instantly and shown on screen.",
  },
  {
    title: "Download your form",
    body: "Print the generated application form and submit at the campus.",
  },
];

function UmutuHome() {
  const { data: units } = useSuspenseQuery(unitsQuery);

  return (
    <SiteShell>
      <section className="border-b border-border bg-secondary/50 grid-paper">
        <div className="container-page grid gap-10 py-16 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-24">
          <div>
            <Link
              to="/"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground underline underline-offset-4"
            >
              ← All DSTVEB branches
            </Link>
            <p className="eyebrow mt-3">{SITE.branch}</p>
            <h1 className="mt-3 text-4xl leading-[1.05] md:text-6xl">
              Delta State Technical and&nbsp;Vocational Education,&nbsp;Umutu
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {SITE.tagline} Register online, generate your application number instantly and
              download a printable application form.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/apply"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start your application <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                to="/units"
                className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-paper px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Explore trade units
              </Link>
            </div>
          </div>
          <div className="surface-card p-6">
            <p className="eyebrow">Admission at a glance</p>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-md border border-border bg-background p-4">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <dt className="mt-3 font-display text-2xl font-bold">{value}</dt>
                  <dd className="text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="rule-accent">
          <p className="eyebrow">Trade units</p>
          <h2 className="mt-2 text-2xl md:text-3xl">Programmes you can apply for</h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.slice(0, 6).map((unit) => (
            <Link
              key={unit.id}
              to="/units/$slug"
              params={{ slug: unit.slug }}
              className="surface-card group flex flex-col p-5 transition-shadow hover:shadow-raised"
            >
              <h3 className="font-display text-lg">{unit.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {unit.summary}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                View unit
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
        <Link
          to="/units"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
        >
          See all {units.length} units
        </Link>
      </section>

      <section className="border-y border-border bg-secondary/50">
        <div className="container-page py-16 md:py-20">
          <div className="rule-accent">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 text-2xl md:text-3xl">
              Four steps from interest to admission form
            </h2>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="surface-card p-5">
                <span className="grid size-8 place-items-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display text-base">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="surface-card flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <FileText className="size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-2xl">Already applied?</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Retrieve your existing application with the email and phone number you registered
              with, then download your application form again.
            </p>
          </div>
          <Link
            to="/apply"
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border-strong px-6 py-3 text-sm font-semibold hover:bg-accent"
          >
            Check my application
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
