/**
 * Shared CSV shaping for admin exports.
 *
 * One consistent schema: a single "Full Name" column, human-formatted dates,
 * and a stable column order that matches the row builder below.
 */

export const APPLICANT_CSV_COLUMNS = [
  "Application Number",
  "Full Name",
  "Email",
  "Phone",
  "Gender",
  "Date of Birth",
  "Nationality",
  "State of Origin",
  "LGA",
  "Residential Address",
  "Selected Unit",
  "Stream",
  "Status",
  "Applied On",
] as const;

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Lagos",
});

const DATE_TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Lagos",
});

/** `1998-04-02` → `02 Apr 1998`. Empty string when absent/invalid. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(d.getTime()) ? "" : DATE_FMT.format(d);
}

/** ISO timestamp → `02 Apr 1998, 14:35` in Lagos time. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : DATE_TIME_FMT.format(d).replace(", ", ", ");
}

export function fullName(
  first: string | null | undefined,
  middle: string | null | undefined,
  last: string | null | undefined,
): string {
  return [first, middle, last]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const escapeCell = (value: unknown): string => {
  const s = value == null ? "" : String(value).replace(/\r?\n/g, " ").trim();
  return /[",;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Build a CSV document with a UTF-8 BOM so Excel keeps accents intact. */
export function toCsv(headers: readonly string[], rows: readonly unknown[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
