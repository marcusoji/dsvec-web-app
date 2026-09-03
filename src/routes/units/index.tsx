import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Clock } from "lucide-react";

import { PageHero, SiteShell } from "@/components/site/site-shell";
import { listUnits } from "@/lib/units.functions";

const DESCRIPTION =
  "Browse every technical and vocational trade unit offered at the DSTVEB Umutu Branch, with skills covered, career paths, duration and entry requirements.";

const unitsQuery = queryOptions({ queryKey: ["units"], queryFn: () => listUnits() });

export const Route = createFileRoute("/units/")({
  head: () => ({
    meta: [
      { title: "Trade Units & Programmes | DSTVEB Umutu Branch" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Trade Units & Programmes | DSTVEB Umutu" },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(unitsQuery),
  component: Units,
});

function Units() {
  const { data: units } = useSuspenseQuery(unitsQuery);

  return (
    <SiteShell>
      <PageHero
        eyebrow="Programmes"
        title="Trade units offered at Umutu"
        lead="Each unit combines workshop practicals, safety training and continuous assessment. Choose a unit to see the full curriculum outline and entry requirements."
      />
      <section className="container-page py-14">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">
            {units.length} active trade units at the Umutu branch.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => (
            <article key={unit.id} className="surface-card flex flex-col p-6">
              <h2 className="font-display text-lg">{unit.name}</h2>
              {unit.duration ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden="true" /> {unit.duration}
                </p>
              ) : null}
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {unit.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {unit.skills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[0.7rem]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <Link
                to="/units/$slug"
                params={{ slug: unit.slug }}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
              >
                Unit details <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
