import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { PageHero, SiteShell } from "@/components/site/site-shell";
import { SITE } from "@/lib/site";

const DESCRIPTION =
  "Contact the DSTVEB Umutu Branch admissions office — campus address in Ukwuani, phone number, WhatsApp, email address and office opening hours.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact the Admissions Office | DSTVEB Umutu Branch" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Contact | DSTVEB Umutu Branch" },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Contact,
});

function Contact() {
  const items = [
    { icon: MapPin, label: "Campus address", value: SITE.address },
    {
      icon: Phone,
      label: "Phone",
      value: SITE.phone,
      href: `tel:${SITE.phone.replace(/\s/g, "")}`,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: SITE.whatsapp,
      href: `https://wa.me/${SITE.whatsapp.replace(/\+|\s/g, "")}`,
    },
    { icon: Mail, label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
    { icon: Clock, label: "Office hours", value: SITE.officeHours },
  ];

  return (
    <SiteShell>
      <PageHero
        eyebrow="Contact"
        title="Talk to the Admissions Office"
        lead="Visit the campus, call or send an email. Quote your application number in any correspondence about an existing application."
      />
      <section className="container-page grid gap-4 py-14 sm:grid-cols-2">
        {items.map(({ icon: Icon, label, value, href }) => (
          <article key={label} className="surface-card p-6">
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <h2 className="mt-4 font-display text-base">{label}</h2>
            {href ? (
              <a
                href={href}
                className="mt-1 block text-sm text-muted-foreground underline underline-offset-4"
              >
                {value}
              </a>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{value}</p>
            )}
          </article>
        ))}
      </section>
    </SiteShell>
  );
}
