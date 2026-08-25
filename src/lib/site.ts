export const SITE = {
  shortName: "DSTVTE Umutu",
  name: "Delta State Technical and Vocational Education",
  branch: "Umutu Branch / Annex",
  tagline: "Practical skills. Certified trades. Real livelihoods.",
  description:
    "Delta State Technical and Vocational Education, Umutu Branch — hands-on trade training, certified vocational units and online admission application.",
  address: "DSTVTE Umutu Branch / Annex, Umutu, Ndokwa West LGA, Delta State, Nigeria",
  email: "admissions@dstvte-umutu.example.ng",
  phone: "+234 800 000 0000",
  officeHours: "Monday – Friday, 8:00am – 4:00pm (WAT)",
} as const;

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/units", label: "Units" },
  { to: "/admissions", label: "Admissions" },
  { to: "/contact", label: "Contact" },
] as const;
