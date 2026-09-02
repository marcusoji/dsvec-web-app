import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { BOARD, BRANCHES } from "@/lib/branches";

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
    body: `${BRANCHES.length} technical colleges and vocational centres across Delta North, Central and South.`,
  },
];

const ZONES = ["Delta North", "Delta Central", "Delta South"] as const;

function BoardHome() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-ink text-ink-foreground">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <span className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="size-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold">{BOARD.shortName}</span>
              <span className="block text-[0.7rem] text-ink-muted">Delta State, Nigeria</span>
            </span>
          </span>
          <a
            href="#branches"
            className="rounded-md border border-ink-muted/40 px-4 py-2 text-sm font-semibold"
          >
            Find a branch
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
          <p className="eyebrow">Branches</p>
          <h2 className="mt-2 text-2xl md:text-3xl">Technical & vocational centres statewide</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Click a branch to open its portal. Online admissions are currently live for the Umutu
            branch; other centres accept applications at the campus office.
          </p>
        </div>

        {ZONES.map((zone) => {
          const branches = BRANCHES.filter((b) => b.zone === zone);
          if (branches.length === 0) return null;
          return (
            <div key={zone} className="mt-10">
              <h3 className="font-display text-lg">{zone}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {branches.map((branch) =>
                  branch.online ? (
                    <Link
                      key={branch.slug}
                      to="/umutu"
                      className="surface-card group flex flex-col border-primary/40 p-5 transition-shadow hover:shadow-raised"
                    >
                      <span className="inline-flex w-fit rounded-full bg-primary px-2.5 py-0.5 text-[0.7rem] font-semibold text-primary-foreground">
                        Online applications open
                      </span>
                      <h4 className="mt-3 font-display text-lg">{branch.name}</h4>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden="true" /> {branch.lga}
                      </p>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {branch.focus}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
                        Open branch site
                        <ArrowRight
                          className="size-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  ) : (
                    <article key={branch.slug} className="surface-card flex flex-col p-5">
                      <span className="inline-flex w-fit rounded-full border border-border px-2.5 py-0.5 text-[0.7rem] text-muted-foreground">
                        Campus applications
                      </span>
                      <h4 className="mt-3 font-display text-lg">{branch.name}</h4>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden="true" /> {branch.lga}
                      </p>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {branch.focus}
                      </p>
                      <div className="mt-4 space-y-1 text-sm">
                        <a
                          href={`tel:${branch.phone.replace(/\s/g, "")}`}
                          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Phone className="size-3.5" aria-hidden="true" /> {branch.phone}
                        </a>
                        <a
                          href={`mailto:${branch.email}`}
                          className="flex items-center gap-1.5 break-all text-muted-foreground hover:text-foreground"
                        >
                          <Mail className="size-3.5 shrink-0" aria-hidden="true" /> {branch.email}
                        </a>
                      </div>
                    </article>
                  ),
                )}
              </div>
            </div>
          );
        })}
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
