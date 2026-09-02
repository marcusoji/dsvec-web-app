export const SITE = {
  /** Acronym — Delta State Technical and Vocational Education Board. */
  shortName: "DSTVEB",
  /** Full governing body name (the acronym short name). */
  name: "Delta State Technical and Vocational Education Board",
  /** The specific campus / branch name. */
  campusName: "Delta State Vocational Center, Umutu",
  branch: "Umutu Branch",
  tagline: "Practical skills. Certified trades. Real livelihoods.",
  description:
    "Delta State Technical and Vocational Education Board (DSTVEB), Umutu Branch — hands-on trade training, certified vocational units and online admission application.",
  address: "Delta State Vocational Center, Umutu, Ukwuani LGA, Delta State, Nigeria",
  email: "dsvecumutu@gmail.com",
  phone: "+2347062140688",
  officeHours: "Monday – Friday, 8:00am – 4:00pm (WAT)",
  /** Application-number prefix used on the downloadable form. */
  applicationPrefix: "DSTVEB-UMU",
} as const;

export const NAV_LINKS = [
  { to: "/umutu", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/units", label: "Units" },
  { to: "/admissions", label: "Admissions" },
  { to: "/contact", label: "Contact" },
] as const;
