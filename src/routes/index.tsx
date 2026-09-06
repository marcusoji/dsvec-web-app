import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, MapPin, ShieldCheck, Wrench } from "lucide-react";

import { BOARD, BRANCHES } from "@/lib/branches";
import logoDstveb from "@/assets/logo-dstveb.jpg";
import logoDelta from "@/assets/logo-delta.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DSTVEB — Delta State Technical & Vocational Education Board" },
      { name: "description", content: BOARD.description },
      { property: "og:title", content: "DSTVEB — Technical & Vocational Education, Delta State" },
      { property: "og:description", content: BOARD.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BoardHome,
});

const PILLARS = [
  {
    icon: Wrench,
    title: "Trade-first training",
    body: "Workshop-based instruction in engineering, building, ICT, garment, catering and agro trades.",
  },
  {
    icon: ShieldCheck,
    title: "Certified assessment",
    body: "Every trainee is assessed practically and certified to a recognised state trade standard.",
  },
  {
    icon: Building2,
    title: "Centres statewide",
    body: `${BRANCHES.length} technical colleges and vocational centres across Delta State.`,
  },
];

function BoardHome() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-ink text-ink-foreground">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <span className="flex items-center gap-3">
            <img
              src={logoDstveb}
              alt="DSTVEB logo"
              className="size-10 rounded-md bg-white object-contain p-0.5"
            />
            <img
              src={logoDelta}
              alt="Delta State government seal"
              className="hidden size-10 rounded-md bg-white object-contain p-0.5 sm:block"
            />
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold">{BOARD.shortName}</span>
              <span className="block text-[0.7rem] text-ink-muted">Delta State, Nigeria</span>
            </span>
          </span>
          <a
            href="#branches"
            className="rounded-md border border-ink-muted/40 px-4 py-2 text-sm font-semibold"
          >
            Find a centre
          </a>
        </div>
      </header>


      <section className="border-b border-border bg-secondary/50 grid-paper">
        <div className="container-page grid gap-10 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
          <div>
            <p className="eyebrow">Delta State Government</p>
            <h1 className="mt-3 text-4xl leading-[1.05] md:text-6xl">{BOARD.name}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {BOARD.tagline} Select your branch below to see its trade units, admission
              requirements and application portal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#branches"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Find your branch <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="surface-card p-6">
            <p className="eyebrow">The board at a glance</p>
            <ul className="mt-4 space-y-4">
              {PILLARS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <span className="block font-display text-base">{title}</span>
                    <span className="block text-sm text-muted-foreground">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="branches" className="container-page py-16 md:py-20">
        <div className="rule-accent">
          <p className="eyebrow">Centres</p>
          <h2 className="mt-2 text-2xl md:text-3xl">Technical & vocational centres statewide</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Online admissions are currently live for the Umutu centre; other centres accept
            applications at the campus office.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BRANCHES.map((branch) => (
            <article key={branch.slug} className="surface-card flex flex-col p-5">
              <h3 className="font-display text-lg">{branch.name}</h3>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden="true" /> {branch.lga}
              </p>
              {branch.online ? (
                <Link
                  to="/umutu"
                  className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Visit website
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="mt-4 inline-flex w-fit cursor-not-allowed items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted-foreground"
                  title="This centre has no website yet"
                >
                  Website coming soon
                </span>
              )}
            </article>
          ))}
        </div>

      </section>

      <footer className="border-t border-border bg-ink text-ink-muted">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-8 text-sm">
          <div>
            <p className="font-display text-ink-foreground">{BOARD.name}</p>
            <p className="mt-1">{BOARD.headquarters}</p>
          </div>
          <div className="text-right">
            <a href={`mailto:${BOARD.email}`} className="block hover:text-ink-foreground">
              {BOARD.email}
            </a>
            <a
              href={`tel:${BOARD.phone.replace(/\s/g, "")}`}
              className="block hover:text-ink-foreground"
            >
              {BOARD.phone}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
