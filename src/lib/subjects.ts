/**
 * Assessment marks are spread over the subjects a trade unit teaches.
 *
 * A unit chooses how many subjects it assesses (`units.subject_count`) and the
 * 100-point total is divided evenly between them. When 100 does not divide
 * cleanly the remainder is carried by the last slots, so the parts always add
 * back to exactly 100:
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

export function splitMarks(count: number): number[] {
  const n = Math.max(MIN_SUBJECTS, Math.min(MAX_SUBJECTS, Math.trunc(count) || MIN_SUBJECTS));
  const base = Math.floor(TOTAL_MARKS / n);
  const remainder = TOTAL_MARKS - base * n;
  return Array.from({ length: n }, (_, i) => (i < n - remainder ? base : base + 1));
}

/** "33 / 33 / 34" — the per-subject maxima, for captions and table headers. */
export function splitLabel(count: number): string {
  return splitMarks(count).join(" / ");
}

export function subjectCountLabel(count: number): string {
  return `${count} subject${count === 1 ? "" : "s"}`;
}
