/**
 * DSTVEB centre directory.
 *
 * The board runs technical & vocational centres across Delta State. Only the
 * Umutu centre currently has an online application portal in this system.
 */

export type Branch = {
  slug: string;
  name: string;
  lga: string;
  /** Centres with an online portal link into the Umutu site. */
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
  { slug: "asaba", name: "Asaba Centre", lga: "Oshimili South LGA", online: false },
  { slug: "umutu", name: "Umutu Centre", lga: "Ukwuani LGA", online: true },
  { slug: "ozoro", name: "Ozoro Centre", lga: "Isoko North LGA", online: false },
  { slug: "sapele", name: "Sapele Centre", lga: "Sapele LGA", online: false },
  { slug: "agbarho", name: "Agbarho Centre", lga: "Ughelli North LGA", online: false },
  { slug: "mbiri", name: "Mbiri Centre", lga: "Ika North East LGA", online: false },
  { slug: "otor-owhe", name: "Otor-Owhe Centre", lga: "Isoko South LGA", online: false },
  { slug: "afiesere", name: "Afiesere Centre", lga: "Ughelli North LGA", online: false },
  { slug: "owa-oyibu", name: "Owa-Oyibu Centre", lga: "Ika North East LGA", online: false },
  { slug: "orerokpe", name: "Orerokpe Centre", lga: "Okpe LGA", online: false },
  { slug: "egbokodo", name: "Egbokodo Centre", lga: "Warri South LGA", online: false },
  { slug: "bulu-angiama", name: "Bulu-Angiama Centre", lga: "Bomadi LGA", online: false },
  { slug: "emede", name: "Emede Centre", lga: "Isoko South LGA", online: false },
  { slug: "kokori", name: "Kokori Centre", lga: "Ethiope East LGA", online: false },
  { slug: "oza-nogogo", name: "Oza-Nogogo Centre", lga: "Ika North East LGA", online: false },
];
