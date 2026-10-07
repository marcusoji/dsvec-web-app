import type { ArchiveRow } from "./admin.functions";
import { listArchivePhotoUrls, type ArchivePhotoRef } from "./admin.functions";
import { SITE } from "./site";

/** The workbook row: the stored record plus a pointer to its files in the zip. */
export type ArchiveSheetRow = Omit<ArchiveRow, "test_score" | "exam_score"> & {
  test_score: number | "";
  exam_score: number | "";
  photo_file: string;
  form_file: string;
};

/**
 * The single Excel schema used whenever past records are downloaded before
 * deletion. Keeping it in one place means the stale-applicant prompt and the
 * storage clean-up panel always produce the same workbook.
 */
export const ARCHIVE_COLUMNS: { header: string; key: keyof ArchiveSheetRow; width: number }[] = [
  { header: "Application Number", key: "application_number", width: 24 },
  { header: "Full Name", key: "full_name", width: 28 },
  { header: "Email", key: "email", width: 28 },
  { header: "Phone", key: "phone", width: 16 },
  { header: "Gender", key: "gender", width: 10 },
  { header: "Date of Birth", key: "date_of_birth", width: 14 },
  { header: "Nationality", key: "nationality", width: 14 },
  { header: "State of Origin", key: "state", width: 16 },
  { header: "LGA", key: "local_government", width: 16 },
  { header: "Residential Address", key: "address", width: 36 },
  { header: "Next of Kin", key: "next_of_kin", width: 32 },
  { header: "School", key: "school", width: 24 },
  { header: "Qualification", key: "qualification", width: 18 },
  { header: "Year Completed", key: "school_year", width: 14 },
  { header: "Trade Unit", key: "unit", width: 24 },
  { header: "Stream", key: "stream", width: 10 },
  { header: "Status", key: "status", width: 14 },
  { header: "Test (40)", key: "test_score", width: 10 },
  { header: "Exam (60)", key: "exam_score", width: 10 },
  { header: "Applied On", key: "applied_on", width: 20 },
  { header: "Photo File", key: "photo_file", width: 30 },
  { header: "Application Form", key: "form_file", width: 34 },
];

/** `DSTVEB-UMU-2026-0007` → `DSTVEB-UMU-2026-0007.jpg` (filesystem-safe). */
function photoFileName(applicationNumber: string, ext: string): string {
  const safe = applicationNumber.replace(/[^\w.-]+/g, "_");
  return `${safe}.${ext}`;
}

/** `DSTVEB-UMU-2026-0007` → `DSTVEB-UMU-2026-0007.html` (filesystem-safe). */
function formFileName(applicationNumber: string): string {
  const safe = applicationNumber.replace(/[^\w.-]+/g, "_");
  return `${safe}.html`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A self-contained, printable copy of the applicant's form (the same content
 * as `/application/$token`). It is written as `.html` so the archive is portable
 * and needs no external assets; opening it in a browser offers print / save as
 * PDF. This is the "application form" included per person in the zip.
 */
export function buildApplicationFormHtml(row: ArchiveRow): string {
  const field = (label: string, value: string) =>
    `<div class="f"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "—")}</dd></div>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Application Form — ${escapeHtml(row.application_number)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; margin: 0; background: #f3f3f1; }
  .sheet { max-width: 210mm; margin: 16px auto; background: #fff; padding: 24px 28px; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
  header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #999; padding-bottom: 12px; }
  h1 { font-size: 18px; margin: 0; }
  .muted { color: #555; font-size: 12px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 20px 0 10px; }
  dl, .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 32px; margin: 0; }
  .grid.three { grid-template-columns: 1fr 1fr 1fr; }
  dt { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #666; }
  dd { margin: 2px 0 0; font-weight: 600; }
  .headline { font-size: 22px; font-weight: 900; }
  .sign { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
  .sign div { border-top: 1px solid #333; padding-top: 6px; font-size: 12px; }
  footer { border-top: 1px solid #333; margin-top: 20px; padding-top: 10px; font-size: 11px; color: #555; }
  @media print { body { background: #fff; } .sheet { box-shadow: none; margin: 0; max-width: none; } }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div>
      <h1>Application Form</h1>
      <p class="muted">${escapeHtml(SITE.campusName)}</p>
      <p class="muted">${escapeHtml(SITE.name)}</p>
    </div>
    <div class="muted" style="text-align:right">
      <div>Official document — one application per applicant</div>
      <div>${escapeHtml(SITE.address)}</div>
    </div>
  </header>

  <div class="grid" style="margin-top:16px">
    <div><dt>Application number</dt><dd class="headline">${escapeHtml(row.application_number)}</dd></div>
    <div><dt>Status</dt><dd>${escapeHtml(row.status)}</dd></div>
    <div><dt>Date of application</dt><dd>${escapeHtml(row.applied_on)}</dd></div>
    <div><dt>Apply-to centre</dt><dd>${escapeHtml(SITE.campusName)}</dd></div>
  </div>

  <h2>Section A — Applicant particulars</h2>
  <dl>
    ${field("Full name", row.full_name)}
    ${field("Gender", row.gender)}
    ${field("Date of birth", row.date_of_birth)}
    ${field("Nationality", row.nationality)}
    ${field("State of origin", row.state)}
    ${field("Local government area", row.local_government)}
    ${field("Residential address", row.address)}
    ${field("Email address", row.email)}
    ${field("Phone number", row.phone)}
  </dl>

  <h2>Section B — Programme of study</h2>
  <div class="grid three">
    ${field("Trade unit applied for", row.unit)}
    ${field("Stream", row.stream)}
    ${field("Programme", "Vocational Certificate")}
    ${field("Duration", "6 months")}
  </div>

  <h2>Section C — Parent / guardian contact</h2>
  <dl>${field("Parent / guardian or next of kin", row.next_of_kin)}</dl>

  <h2>Section D — Educational background</h2>
  <div class="grid three">
    ${field("Most recent school / institution", row.school)}
    ${field("Qualification obtained", row.qualification)}
    ${field("Year last attended / completed", row.school_year)}
  </div>

  <h2>Section E — Declaration</h2>
  <ol class="muted" style="line-height:1.6">
    <li>I declare that all the information provided in this application form is true and correct to the best of my knowledge.</li>
    <li>I understand that providing false information or forged documents will lead to cancellation of my application or admission.</li>
    <li>I agree to abide by the rules and code of conduct of the ${escapeHtml(SITE.campusName)}.</li>
  </ol>
  <div class="sign"><div>Applicant's signature</div><div>Parent / guardian (if under 18)</div><div>Date</div></div>

  <footer>
    ${escapeHtml(SITE.name)} — ${escapeHtml(SITE.branch)}. Archived application record for the
    ${escapeHtml(SITE.campusName)}.
  </footer>
</div>
</body>
</html>`;
}

type SummaryCount = { label: string; value: number };

function tally(rows: ArchiveRow[], key: (row: ArchiveRow) => string): SummaryCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row) || "—";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export type ArchiveTotals = {
  records: number;
  photosIncluded: number;
  photosMissing: number;
  formsIncluded: number;
};

/**
 * A second worksheet that reconciles the archive before anything is deleted:
 * the exact number of records, how they break down by status, unit, stream and
 * gender, how many photos/forms were bundled, and when the archive was made.
 * The totals here must match the "Past records" sheet and the number the caller
 * is about to delete.
 */
function buildSummarySheet(
  wb: import("exceljs").Workbook,
  rows: ArchiveRow[],
  totals: ArchiveTotals,
): void {
  const ws = wb.addWorksheet("Summary");
  ws.columns = [
    { header: "Measure", key: "measure", width: 34 },
    { header: "Value", key: "value", width: 40 },
  ];
  ws.getRow(1).font = { bold: true };

  const add = (measure: string, value: string | number) => ws.addRow({ measure, value });
  const section = (title: string) => {
    const r = ws.addRow({ measure: title });
    r.font = { bold: true };
  };

  add("Archive generated", new Date().toISOString());
  add("Total records in archive", totals.records);
  add("Application forms included", totals.formsIncluded);
  add("Photographs included", totals.photosIncluded);
  add("Photographs missing", totals.photosMissing);

  section("By status");
  for (const c of tally(rows, (r) => r.status)) add(`  ${c.label}`, c.value);
  section("By trade unit");
  for (const c of tally(rows, (r) => r.unit)) add(`  ${c.label}`, c.value);
  section("By stream");
  for (const c of tally(rows, (r) => r.stream)) add(`  ${c.label}`, c.value);
  section("By gender");
  for (const c of tally(rows, (r) => r.gender)) add(`  ${c.label}`, c.value);
}

async function buildWorkbook(
  sheetRows: ArchiveSheetRow[],
  archiveRows: ArchiveRow[],
  totals: ArchiveTotals,
): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = `${SITE.shortName} ${SITE.branch}`;

  const records = wb.addWorksheet("Past records");
  records.columns = ARCHIVE_COLUMNS;
  records.addRows(sheetRows);
  records.getRow(1).font = { bold: true };
  records.views = [{ state: "frozen", ySplit: 1 }];

  buildSummarySheet(wb, archiveRows, totals);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const README = `DSTVEB Umutu Branch — archived application records
=================================================

Contents
--------
  records.xlsx      Two sheets. "Past records" is the full data table. "Summary"
                    reconciles the archive: total records, how they break down,
                    and how many forms/photos were bundled.
  forms/            One printable .html application form per applicant, named
                    by application number. Open in a browser to preview, print
                    or save as PDF.
  photos/           Passport photographs, named by application number.
  README.txt        This file.

Every record in "Past records" has a matching form (forms/) and photograph
(photos/) because each was exported before deletion. Keep this zip somewhere
safe — the records it contains are removed from the portal by the clean-up.
`;

/**
 * Downloads past records as one `.zip` containing `records.xlsx`, a printable
 * application form per person (`forms/`), their photographs (`photos/`) and a
 * `README.txt`. The sheet's Photo File / Application Form columns point at each
 * file.
 *
 * Photos are signed and fetched in small chunks, and a failed image is skipped
 * rather than aborting the whole export. Returns what was included so the
 * caller can report the reconciled totals.
 */
export async function downloadArchiveBundle(
  rows: ArchiveRow[],
  filenamePrefix: string,
): Promise<{ photos: number; forms: number; records: number }> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Sign and fetch photos in chunks so one request stays small.
  const photos: ArchivePhotoRef[] = [];
  for (let i = 0; i < rows.length; i += 150) {
    const chunk = rows.slice(i, i + 150).map((r) => r.id);
    const refs = await listArchivePhotoUrls({ data: { ids: chunk } });
    photos.push(...refs);
  }

  const byApplicant = new Map(photos.map((p) => [p.applicant_id, p]));
  const photoFolder = zip.folder("photos");
  const formFolder = zip.folder("forms");
  let photosIncluded = 0;
  for (const photo of photos) {
    try {
      const res = await fetch(photo.url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      photoFolder?.file(photoFileName(photo.application_number, photo.ext), buf);
      photosIncluded += 1;
    } catch {
      /* a missing photo must not block the records export */
    }
  }

  // One printable application form per record — the archive is per-person, not
  // just a spreadsheet row.
  let formsIncluded = 0;
  for (const row of rows) {
    formFolder?.file(formFileName(row.application_number), buildApplicationFormHtml(row));
    formsIncluded += 1;
  }

  const sheetRows = rows.map((r): ArchiveSheetRow => {
    const photo = byApplicant.get(r.id);
    return {
      ...r,
      test_score: r.test_score ?? "",
      exam_score: r.exam_score ?? "",
      photo_file: photo ? `photos/${photoFileName(photo.application_number, photo.ext)}` : "",
      form_file: `forms/${formFileName(r.application_number)}`,
    };
  });

  const totals: ArchiveTotals = {
    records: rows.length,
    photosIncluded,
    photosMissing: rows.length - photosIncluded,
    formsIncluded,
  };
  zip.file("records.xlsx", await buildWorkbook(sheetRows, rows, totals));
  zip.file("README.txt", README);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return { photos: photosIncluded, forms: formsIncluded, records: rows.length };
}
