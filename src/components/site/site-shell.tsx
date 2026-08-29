import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, GraduationCap, Mail, Phone, MapPin } from "lucide-react";
import { useState, type ReactNode } from "react";

import { NAV_LINKS, SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

function Brand({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label={`${SITE.shortName} home`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <GraduationCap className="size-5" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block font-display text-sm font-bold tracking-tight",
            tone === "ink" ? "text-foreground" : "text-ink-foreground",
          )}
        >
          {SITE.shortName}
        </span>
        <span
          className={cn(
            "block max-w-[16rem] truncate text-[0.7rem]",
            tone === "ink" ? "text-muted-foreground" : "text-ink-muted",
          )}
        >
          {SITE.campusName}
        </span>
      </span>
    </Link>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="bg-ink text-ink-muted">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-1.5 text-[0.72rem]">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3" aria-hidden="true" /> Umutu, Ukwuani LGA, Delta State
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="size-3" aria-hidden="true" /> {SITE.phone}
          </span>
        </div>
      </div>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Brand />
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            to="/apply"
            className="ml-2 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Apply now
          </Link>
        </nav>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md border border-border md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-border md:hidden">
          <div className="container-page flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-sm font-medium text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/apply"
              onClick={() => setOpen(false)}
              className="mt-2 mb-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Apply now
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-ink-muted">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Brand tone="paper" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            {SITE.name}, {SITE.branch}. Practical, trade-focused vocational training for school
            leavers, artisans and career changers in Delta State.
          </p>
        </div>
        <div>
          <h2 className="font-display text-sm font-bold text-ink-foreground">Explore</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/apply" className="hover:text-primary">
                Apply / Check application
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-sm font-bold text-ink-foreground">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{SITE.address}</span>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <a className="hover:text-primary" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <a className="hover:text-primary" href={`tel:${SITE.phone.replace(/\s/g, "")}`}>
                {SITE.phone}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-5 text-xs">
          <p>
            © {new Date().getFullYear()} {SITE.name} — {SITE.branch}. All rights reserved.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-1.5 font-medium text-ink-muted transition-colors hover:border-primary hover:text-primary"
            title="Sign in to the staff portal — authorized personnel only"
          >
            <Lock className="size-3" aria-hidden="true" />
            Staff portal — authorized personnel only
          </Link>
        </div>

      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <section className="border-b border-border bg-secondary/60 grid-paper">
      <div className="container-page py-14 md:py-20">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-3xl md:text-5xl">{title}</h1>
        {lead ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{lead}</p>
        ) : null}
      </div>
    </section>
  );
}
