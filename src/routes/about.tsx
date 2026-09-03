import { createFileRoute } from "@tanstack/react-router";
import { Compass, Eye, HeartHandshake, Target } from "lucide-react";

import { PageHero, SiteShell } from "@/components/site/site-shell";
import { SITE } from "@/lib/site";
import weldingImg from "@/assets/unit-welding.jpg";
import ictImg from "@/assets/unit-ict.jpg";
import tailoringImg from "@/assets/unit-tailoring.jpg";
import carpentryImg from "@/assets/unit-carpentry.jpg";


const DESCRIPTION =
  "About the DSTVEB Umutu Branch: mission, vision, campus facilities and the leadership team behind Delta State's technical and vocational training annex at Umutu.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About DSTVEB Umutu Branch | Mission, Vision & Campus" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "About DSTVEB Umutu Branch" },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: About,
});

const PILLARS = [
  {
    icon: Target,
    title: "Mission",
    body: "To equip Delta State youths and adults with certified, employable technical and vocational skills through practical, workshop-based training.",
  },
  {
    icon: Eye,
    title: "Vision",
    body: "To be the reference centre for trade training and enterprise development in Ukwuani and the wider Delta State region.",
  },
  {
    icon: HeartHandshake,
    title: "Values",
    body: "Discipline, craftsmanship, safety, integrity and service to the community in every workshop and classroom.",
  },
  {
    icon: Compass,
    title: "Approach",
    body: "Small cohorts, instructor-led practicals, continuous assessment and industry attachment for every trade unit.",
  },
];

const FACILITIES = [
  "Electrical and electronics workshop",
  "Welding and fabrication bay",
  "Automobile service pit",
  "Catering and bakery kitchen",
  "Fashion and garment studio",
  "ICT laboratory",
  "Carpentry and joinery shed",
  "Cosmetology practice salon",
];

const UNIT_IMAGES = [
  { src: weldingImg, alt: "Trainee welding metal in the fabrication workshop", caption: "Welding & fabrication" },
  { src: ictImg, alt: "Trainees at computers in the ICT training room", caption: "ICT & computer studies" },
  { src: tailoringImg, alt: "Trainees sewing garments on machines", caption: "Tailoring & garment making" },
  { src: carpentryImg, alt: "Trainee planing timber at a workbench", caption: "Carpentry & woodwork" },
];


function About() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="About us"
        title="A trade-first campus serving Ukwuani and Delta State"
        lead={`${SITE.name}, ${SITE.branch}, trains school leavers, artisans and career changers in the trades that local industry and communities actually need.`}
      />

      <section className="container-page py-16">
        <div className="grid gap-4 md:grid-cols-2">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="surface-card p-6">
              <Icon className="size-6 text-primary" aria-hidden="true" />
              <h2 className="mt-4 font-display text-xl">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/50">
        <div className="container-page grid gap-10 py-16 md:grid-cols-2">
          <div>
            <div className="rule-accent">
              <p className="eyebrow">Campus</p>
              <h2 className="mt-2 text-2xl">Facilities and workshops</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Training at Umutu is delivered in dedicated workshops with hands-on equipment, safety
              supervision and instructor demonstrations. Placeholder facility list — editable by
              administrators.
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {FACILITIES.map((facility) => (
              <li
                key={facility}
                className="rounded-md border border-border bg-paper px-4 py-3 text-sm"
              >
                {facility}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="rule-accent">
          <p className="eyebrow">Workshops</p>
          <h2 className="mt-2 text-2xl">Inside our trade units</h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {UNIT_IMAGES.map((image) => (
            <figure key={image.caption} className="surface-card overflow-hidden">
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                width={1024}
                height={768}
                className="aspect-[4/3] w-full object-cover"
              />
              <figcaption className="px-4 py-3 font-display text-sm">{image.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

    </SiteShell>
  );
}
