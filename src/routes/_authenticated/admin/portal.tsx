import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, MapPin, Phone, User } from "lucide-react";

import { listUnits } from "@/lib/units.functions";

const DESCRIPTION = "Unit directory with contacts for the DSTVEB Umutu Branch staff portal.";

const unitsQuery = queryOptions({ queryKey: ["units"], queryFn: () => listUnits() });

export const Route = createFileRoute("/_authenticated/admin/portal")({
  head: () => ({
    meta: [
      { title: "Unit Directory | DSTVEB Umutu Branch Staff Portal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(unitsQuery),
  component: PortalUnitDirectory,
});

function PortalUnitDirectory() {
  const { data: units } = useSuspenseQuery(unitsQuery);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display">Unit directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trade units and their coordinators at the Umutu branch
          </p>
        </div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline underline-offset-4"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to dashboard
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {units.map((unit) => {
          const hasContact =
            unit.coordinator_name ||
            unit.contact_phone ||
            unit.contact_email ||
            unit.office_location;
          return (
            <article key={unit.id} className="surface-card flex flex-col p-6">
              <h2 className="font-display text-lg">{unit.name}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {unit.summary}
              </p>
              {hasContact ? (
                <ul className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">
                  {unit.coordinator_name ? (
                    <li className="flex items-start gap-2">
                      <User className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="font-medium">{unit.coordinator_name}</span>
                    </li>
                  ) : null}
                  {unit.contact_phone ? (
                    <li className="flex items-start gap-2">
                      <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <a
                        href={`tel:${unit.contact_phone.replace(/\s/g, "")}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {unit.contact_phone}
                      </a>
                    </li>
                  ) : null}
                  {unit.contact_email ? (
                    <li className="flex items-start gap-2">
                      <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <a
                        href={`mailto:${unit.contact_email}`}
                        className="break-all text-muted-foreground hover:text-foreground"
                      >
                        {unit.contact_email}
                      </a>
                    </li>
                  ) : null}
                  {unit.office_location ? (
                    <li className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="text-muted-foreground">{unit.office_location}</span>
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                  No contact details published for this unit.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}