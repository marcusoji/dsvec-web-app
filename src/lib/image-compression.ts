import { TARGET_PHOTO_BYTES } from "@/lib/validation";

/** Passport aspect ratio (width / height) used for the stored photograph. */
export const PHOTO_ASPECT_RATIO = 3 / 4;

/**
 * Largest stored edge. Sized from the printed photo box on the A4 application
 * form (`h-40 w-32`), which is 160x128 CSS px — about 1.67in tall on paper.
 * 533px therefore lands at ~320 DPI, comfortably above the 300 DPI marker where
 * print shops stop improving, and it costs almost nothing: a clean portrait
 * encodes to under 8KB at this size. Only high-detail sources need scaling down
 * to fit the byte budget.
 */
const MAX_STORED_DIM = 533;

/** Below this edge a passport photo stops being legible, so the size budget gives way instead. */
const MIN_STORED_DIM = 120;

/** JPEG quality is searched downward from here before resolution is sacrificed. */
const START_QUALITY = 80;

/** Lowest quality the search will emit; below this, blocking ruins a face. */
const MIN_QUALITY = 45;

/**
 * Centre-crops to the passport aspect ratio, then spends a fixed byte budget.
 *
 * Quality and resolution are traded off together: JPEG quality is stepped down
 * until the encoder bottoms out, and only once that happens is the image scaled
 * down further. Cropping and scaling happen in one `drawImage` pass, so the
 * browser resamples once rather than compounding two interpolations.
 */
export function compressPassportPhoto(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  budgetBytes: number = TARGET_PHOTO_BYTES,
): string {
  if (!sourceWidth || !sourceHeight) return "";

  let cropWidth = sourceWidth;
  let cropHeight = sourceWidth / PHOTO_ASPECT_RATIO;
  if (cropHeight > sourceHeight) {
    cropHeight = sourceHeight;
    cropWidth = sourceHeight * PHOTO_ASPECT_RATIO;
  }

  const startScale = Math.min(1, MAX_STORED_DIM / Math.max(cropWidth, cropHeight));
  let width = Math.max(1, Math.round(cropWidth * startScale));
  let height = Math.max(1, Math.round(cropHeight * startScale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  let last = "";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    // Passport photos are shot against a plain backdrop, so flatten before
    // drawing: PNG transparency would otherwise encode as black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(
      source,
      (sourceWidth - cropWidth) / 2,
      (sourceHeight - cropHeight) / 2,
      cropWidth,
      cropHeight,
      0,
      0,
      width,
      height,
    );

    for (let quality = START_QUALITY; quality >= MIN_QUALITY; quality -= 5) {
      last = canvas.toDataURL("image/jpeg", quality / 100);
      if (dataUrlBytes(last) <= budgetBytes) return last;
    }

    const next = Math.max(MIN_STORED_DIM, Math.round(width * 0.85));
    if (next === width) break;
    width = next;
    height = Math.max(MIN_STORED_DIM, Math.round(next / PHOTO_ASPECT_RATIO));
  }

  return last;
}

/** Decoded byte length of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const payload = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}
