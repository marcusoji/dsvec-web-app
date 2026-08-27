import { z } from "zod";

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT - Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(60, `${label} is too long`)
    .regex(/^[A-Za-z][A-Za-z'\-\s]*$/, `${label} may only contain letters, spaces, hyphens`);

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?234|0)[7-9][01]\d{8}$/, "Enter a valid Nigerian phone number");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(160, "Email is too long");

export const personalSchema = z.object({
  first_name: name("First name"),
  middle_name: z
    .string()
    .trim()
    .max(60)
    .regex(/^[A-Za-z'\-\s]*$/, "Middle name may only contain letters")
    .optional()
    .or(z.literal("")),
  last_name: name("Surname"),
  gender: z.enum(["Male", "Female"], { required_error: "Select a gender" }),
  date_of_birth: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date of birth")
    .refine((v) => {
      const age = (Date.now() - Date.parse(v)) / (365.25 * 24 * 3600 * 1000);
      return age >= 14 && age <= 70;
    }, "Applicant must be between 14 and 70 years old"),
  nationality: z.string().trim().min(2).max(60).default("Nigerian"),
});

export const contactSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().trim().min(8, "Enter your full residential address").max(240),
  state: z.string().trim().min(2, "Select your state of origin").max(60),
  local_government: z.string().trim().min(2, "Enter your local government area").max(80),
});

export const unitSchema = z.object({
  unit_id: z.string().uuid("Select a trade unit"),
});

const optionalName = (label: string) =>
  z
    .string()
    .trim()
    .max(80, `${label} is too long`)
    .regex(/^[A-Za-z][A-Za-z'\-\s]*$/, `${label} may only contain letters, spaces, hyphens`)
    .optional()
    .or(z.literal(""));

export const guardianEducationSchema = z.object({
  next_of_kin_name: optionalName("Next of kin name"),
  next_of_kin_relationship: optionalName("Relationship"),
  next_of_kin_phone: z
    .string()
    .trim()
    .regex(/^(\+?234|0)[7-9][01]\d{8}$/, "Enter a valid Nigerian phone number")
    .optional()
    .or(z.literal("")),
  school: optionalName("School / institution"),
  qualification: optionalName("Qualification"),
  school_year: z
    .string()
    .trim()
    .max(12)
    .regex(/^[0-9]{4}(-[0-9]{4})?$/, "Enter a year, e.g. 2024 or 2023–2024")
    .optional()
    .or(z.literal("")),
});

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export const photoSchema = z.object({
  photo_data_url: z
    .string()
    .regex(
      /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/,
      "Upload a JPG, PNG or WebP photograph",
    )
    .refine((v) => v.length * 0.75 <= MAX_PHOTO_BYTES + 1024, "Photograph must be 2MB or smaller"),
});

export const applicationSchema = personalSchema
  .merge(contactSchema)
  .merge(unitSchema)
  .merge(guardianEducationSchema)
  .merge(photoSchema);

export type ApplicationInput = z.infer<typeof applicationSchema>;

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+${digits}`;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
