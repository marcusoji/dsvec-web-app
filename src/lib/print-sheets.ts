/** The two official printouts the branch issues to a trade unit. */
export type SheetKind = "contact" | "scores";

export function printedOn(iso = new Date().toISOString()) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

/**
 * Selects a single sheet for printing via `<html data-print="…">` — the CSS in
 * `styles.css` hides the other sheet — then restores the previous state.
 */
export function printSheet(kind: SheetKind) {
  const root = document.documentElement;
  const previous = root.getAttribute("data-print");
  root.setAttribute("data-print", kind);
  const restore = () => {
    if (previous === null) root.removeAttribute("data-print");
    else root.setAttribute("data-print", previous);
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
  // Safari does not fire `afterprint` reliably; clear the override anyway.
  window.setTimeout(restore, 1000);
}
