import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, FileCheck2, HelpCircle } from "lucide-react";

import { PageHero, SiteShell } from "@/components/site/site-shell";

const DESCRIPTION =
  "Admission requirements, application steps, key dates and frequently asked questions for the DSTVEB Umutu Branch technical and vocational programmes.";

export const Route = createFileRoute("/admissions")({
  head: () => ({
    meta: [
      { title: "Admissions & Requirements | DSTVEB Umutu Branch" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Admissions & Requirements | DSTVEB Umutu" },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Admissions,
});

const REQUIREMENTS = [
  "Applicant must be at least 15 years old at the time of application.",
  "Basic literacy and numeracy; secondary school certificate is an advantage.",
  "One recent passport photograph (JPG or PNG, under 3 MB).",
  "Valid phone number and email address for admission notices.",
  "Physical fitness declaration for workshop-based trades.",
];

const DATES = [
  { label: "Application opens", value: "Rolling — applications accepted year-round" },
  { label: "Screening", value: "Two weeks after submission of the printed form" },
  { label: "Admission notice", value: "By phone and email after screening" },
  { label: "Resumption", value: "Beginning of each training cycle" },
];

const FAQS = [
  {
    q: "Is there an application fee on this website?",
    a: "No. Online registration is free. Any campus charges are communicated directly by the Admissions Office.",
  },
  {
    q: "What happens after I submit the form?",
    a: "You immediately receive an application number and can download a printable application form to submit at the campus.",
  },
  {
    q: "Can I apply twice?",
    a: "No. One application per email and phone number. If you return, the system detects your existing application and lets you download the form again.",
  },
  {
    q: "Can I change my trade unit?",
    a: "Contact the Admissions Office with your application number; staff can update your record before screening.",
  },
];

function Admissions() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Admissions"
        title="How to apply to the Umutu Branch"
        lead="Applications are completed online. Once submitted, your application number is generated instantly and your application form is ready to download and print."
      />

      <section className="container-page grid gap-8 py-14 lg:grid-cols-[1.2fr_1fr]">
        <div className="surface-card p-6">
          <h2 className="inline-flex items-center gap-2 font-display text-xl">
            <FileCheck2 className="size-5 text-primary" aria-hidden="true" /> Entry requirements
          </h2>
          <ul className="mt-5 space-y-3">
            {REQUIREMENTS.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
          <Link
            to="/apply"
            className="mt-7 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Begin registration
          </Link>
        </div>
        <div className="surface-card p-6">
          <h2 className="inline-flex items-center gap-2 font-display text-xl">
            <CalendarDays className="size-5 text-primary" aria-hidden="true" /> Key dates
          </h2>
          <dl className="mt-5 divide-y divide-border">
            {DATES.map((d) => (
              <div key={d.label} className="py-3">
                <dt className="text-sm font-semibold">{d.label}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{d.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/50">
        <div className="container-page py-14">
          <div className="rule-accent">
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-2 inline-flex items-center gap-2 text-2xl">
              <HelpCircle className="size-5 text-primary" aria-hidden="true" /> Common questions
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {FAQS.map((faq) => (
              <article key={faq.q} className="surface-card p-6">
                <h3 className="font-display text-base">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
