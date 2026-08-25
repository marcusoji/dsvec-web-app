import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Briefcase, CheckCircle2, Clock, ListChecks } from "lucide-react";

import { PageHero, SiteShell } from "@/components/site/site-shell";
import { getUnitBySlug } from "@/lib/units.functions";

const unitQuery = (slug: string) =>
  queryOptions({
    queryKey: ["unit", slug],
    queryFn: () => getUnitBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/units/$slug")({
  loader: async ({ context, params }) => {
    const unit = await context.queryClient.ensureQueryData(unitQuery(params.slug));
    if (!unit) throw notFound();
    return unit;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} | DSTVTE Umutu Branch` : "Trade unit | DSTVTE Umutu";
    const description =
      loaderData?.summary ?? "Trade unit details at the DSTVTE Umutu Branch.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: UnitDetail,
  errorComponent: () => (
    <SiteShell>
      <PageHero eyebrow="Units" title="This unit could not be loaded" lead="Please try again later." />
    </SiteShell>
  ),
  notFoundComponent: () => (
    <SiteShell>
      <PageHero
        eyebrow="Units"
        title="Unit not found"
        lead="The trade unit you're looking for is unavailable or has been retired."
      />
    </SiteShell>
  ),
});

function List({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof ListChecks;
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="surface-card p-6">
      <h2 className="inline-flex items-center gap-2 font-display text-base">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {title}
      </h2>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function UnitDetail() {
  const { slug } = Route.useParams();
  const { data: unit } = useSuspenseQuery(unitQuery(slug));
  if (!unit) return null;

  return (
    <SiteShell>
      <PageHero eyebrow="Trade unit" title={unit.name} lead={unit.summary} />
      <section className="container-page grid gap-8 py-14 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="surface-card p-6">
            <h2 className="font-display text-lg">About this unit</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{unit.description}</p>
            {unit.duration ? (
              <p className="mt-5 inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
                <Clock className="size-4 text-primary" aria-hidden="true" /> Duration:{" "}
                <strong className="font-semibold">{unit.duration}</strong>
              </p>
            ) : null}
          </div>
          <List icon={ListChecks} title="Skills you will learn" items={unit.skills} />
          <List icon={Briefcase} title="Career paths" items={unit.careers} />
        </div>
        <aside className="space-y-6">
          <List icon={CheckCircle2} title="Entry requirements" items={unit.requirements} />
          <div className="surface-card p-6">
            <h2 className="font-display text-lg">Ready to apply?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete the online registration form and get your application number instantly.
            </p>
            <Link
              to="/apply"
              search={{ unit: unit.slug }}
              className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Apply for {unit.name}
            </Link>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}
