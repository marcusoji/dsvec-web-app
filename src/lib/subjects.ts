/**
 * Assessment marks are spread over the subjects an instructor names for a trade
 * unit. The 100-point total is divided evenly between the subjects; when 100
 * does not divide cleanly the remainder is carried by the last slots, so the
 * parts always add back to exactly 100:
 *
 *   splitMarks(2) → [50, 50]
 *   splitMarks(3) → [33, 33, 34]
 *   splitMarks(4) → [25, 25, 25, 25]
 *
 * Kept free of React and Supabase imports so the server validator and the
 * printable sheets share one definition.
 */

export const TOTAL_MARKS = 100;
export const MIN_SUBJECTS = 2;
export const MAX_SUBJECTS = 6;
export const DEFAULT_SUBJECTS = MIN_SUBJECTS;

function clampCount(count: number): number {
  return Math.max(MIN_SUBJECTS, Math.min(MAX_SUBJECTS, Math.trunc(count) || DEFAULT_SUBJECTS));
}

export function splitMarks(count: number): number[] {
  const n = clampCount(count);
  const base = Math.floor(TOTAL_MARKS / n);
  const remainder = TOTAL_MARKS - base * n;
  return Array.from({ length: n }, (_, i) => (i < n - remainder ? base : base + 1));
}

/** "33 / 33 / 34" — the per-subject maxima, for captions and table headers. */
export function splitLabel(count: number): string {
  return splitMarks(count).join(" / ");
}

export function subjectCountLabel(count: number): string {
  const n = clampCount(count);
  return `${n} subject${n === 1 ? "" : "s"}`;
}

/**
 * The labels to show for each scored subject. A unit keeps an ordered list of
 * instructor-set names; any slot without a usable name falls back to
 * "Subject n" so an unnamed unit still renders a complete scoresheet.
 */
export function resolveSubjectNames(
  names: readonly string[] | null | undefined,
  count: number,
): string[] {
  const n = clampCount(count);
  return Array.from({ length: n }, (_, i) => {
    const label = names?.[i]?.trim();
    return label && label.length > 0 ? label : `Subject ${i + 1}`;
  });
}

/**
 * Cleans an instructor-supplied name list: trims each entry, keeps the order and
 * rejects duplicates (case-insensitive) so two subjects cannot share a heading.
 * Returns an error message when the input is unusable.
 */
export function normalizeSubjectNames(
  names: readonly string[],
): { names: string[] } | { error: string } {
  const cleaned = names.map((name) => (name ?? "").trim());
  if (cleaned.length < MIN_SUBJECTS || cleaned.length > MAX_SUBJECTS) {
    return { error: `Enter between ${MIN_SUBJECTS} and ${MAX_SUBJECTS} subjects.` };
  }
  if (cleaned.some((name) => name.length === 0)) {
    return { error: "Every subject needs a name." };
  }
  if (cleaned.some((name) => name.length > 60)) {
    return { error: "Subject names must be 60 characters or fewer." };
  }
  const seen = new Set<string>();
  for (const name of cleaned) {
    const key = name.toLowerCase();
    if (seen.has(key)) return { error: `"${name}" is used more than once.` };
    seen.add(key);
  }
  return { names: cleaned };
}
