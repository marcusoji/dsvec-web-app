/**
 * DSTVEB branch directory.
 *
 * The board runs technical & vocational centres across Delta State. Only the
 * Umutu branch currently has an online application portal in this system; the
 * others list their campus contact details.
 */

export type Branch = {
  slug: string;
  name: string;
  lga: string;
  zone: "Delta North" | "Delta Central" | "Delta South";
  focus: string;
  phone: string;
  email: string;
  /** Branches with an online portal link into the Umutu site. */
  online: boolean;
};

export const BOARD = {
  shortName: "DSTVEB",
  name: "Delta State Technical and Vocational Education Board",
  tagline: "Skilled hands. Certified trades. A working Delta.",
  description:
    "Delta State Technical and Vocational Education Board (DSTVEB) oversees technical colleges and vocational centres across Delta State — practical trade training, certification and online admissions.",
  headquarters: "DSTVEB Secretariat, Asaba, Delta State, Nigeria",
  email: "info@dstveb.example.ng",
  phone: "+234 800 000 0000",
} as const;

export const BRANCHES: readonly Branch[] = [
  {
    slug: "umutu",
    name: "Umutu Branch / Annex",
    lga: "Ukwuani LGA",
    zone: "Delta North",
    focus: "Vocational centre — 10 trade units, online admissions open",
    phone: "+2347062140688",
    email: "dsvecumutu@gmail.com",
    online: true,
  },
  {
    slug: "asaba",
    name: "Asaba Technical Centre",
    lga: "Oshimili South LGA",
    zone: "Delta North",
    focus: "Technical college — engineering and building trades",
    phone: "+234 800 000 0001",
    email: "asaba@dstveb.example.ng",
    online: false,
  },
  {
    slug: "agbor",
    name: "Agbor Vocational Centre",
    lga: "Ika South LGA",
    zone: "Delta North",
    focus: "Garment making, catering and ICT",
    phone: "+234 800 000 0002",
    email: "agbor@dstveb.example.ng",
    online: false,
  },
  {
    slug: "issele-uku",
    name: "Issele-Uku Skills Annex",
    lga: "Aniocha North LGA",
    zone: "Delta North",
    focus: "Agro-processing and carpentry",
    phone: "+234 800 000 0003",
    email: "isseleuku@dstveb.example.ng",
    online: false,
  },
  {
    slug: "warri",
    name: "Warri Technical College",
    lga: "Warri South LGA",
    zone: "Delta South",
    focus: "Welding, fabrication and marine trades",
    phone: "+234 800 000 0004",
    email: "warri@dstveb.example.ng",
    online: false,
  },
  {
    slug: "sapele",
    name: "Sapele Vocational Centre",
    lga: "Sapele LGA",
    zone: "Delta Central",
    focus: "Wood technology and furniture making",
    phone: "+234 800 000 0005",
    email: "sapele@dstveb.example.ng",
    online: false,
  },
  {
    slug: "ughelli",
    name: "Ughelli Technical Annex",
    lga: "Ughelli North LGA",
    zone: "Delta Central",
    focus: "Electrical installation and auto mechanics",
    phone: "+234 800 000 0006",
    email: "ughelli@dstveb.example.ng",
    online: false,
  },
  {
    slug: "oleh",
    name: "Oleh Vocational Centre",
    lga: "Isoko South LGA",
    zone: "Delta South",
    focus: "Cosmetology, tailoring and hospitality",
    phone: "+234 800 000 0007",
    email: "oleh@dstveb.example.ng",
    online: false,
  },
];
