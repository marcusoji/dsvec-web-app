import logoDstveb from "@/assets/logo-dstveb.jpg";

/**
 * Board crest for the official printable sheets.
 *
 * The asset carries its own white background, so it needs no backdrop to stay
 * legible on paper — and printing it as an image also avoids the ink-saver
 * behaviour that drops the dark badge background behind the text mark, which
 * would otherwise leave light text on white paper.
 */
export function PrintLogo() {
  return (
    <img
      src={logoDstveb}
      alt="DSTVEB logo"
      className="size-14 shrink-0 rounded-md bg-white object-contain p-0.5"
    />
  );
}
