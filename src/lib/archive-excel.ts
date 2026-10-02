import type { ArchiveRow } from "./admin.functions";
import { listArchivePhotoUrls, type ArchivePhotoRef } from "./admin.functions";

/** The workbook row: the stored record plus a pointer to its photo in the zip. */
export type ArchiveSheetRow = Omit<ArchiveRow, "test_score" | "exam_score"> & {
  test_score: number | "";
  exam_score: number | "";
  photo_file: string;
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
  { header: "State of Origin", key: "state", width: 16 },
  { header: "LGA", key: "local_government", width: 16 },
  { header: "Residential Address", key: "address", width: 36 },
  { header: "Next of Kin", key: "next_of_kin", width: 32 },
  { header: "School", key: "school", width: 24 },
  { header: "Qualification", key: "qualification", width: 18 },
  { header: "Trade Unit", key: "unit", width: 24 },
  { header: "Stream", key: "stream", width: 10 },
  { header: "Status", key: "status", width: 14 },
  { header: "Test (40)", key: "test_score", width: 10 },
  { header: "Exam (60)", key: "exam_score", width: 10 },
  { header: "Applied On", key: "applied_on", width: 20 },
  { header: "Photo File", key: "photo_file", width: 30 },
];

/** `DSTVEB-UMU-2026-0007` → `DSTVEB-UMU-2026-0007.jpg` (filesystem-safe). */
function photoFileName(applicationNumber: string, ext: string): string {
  const safe = applicationNumber.replace(/[^\w.-]+/g, "_");
  return `${safe}.${ext}`;
}

async function buildWorkbook(rows: ArchiveSheetRow[]): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Past records");
  ws.columns = ARCHIVE_COLUMNS;
  ws.addRows(rows);
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Downloads past records as one `.zip` containing `records.xlsx` plus a
 * `photos/` folder. The Photo File column in the sheet points at each image.
 *
 * Photos are signed and fetched in small chunks, and a failed image is skipped
 * rather than aborting the whole export. Returns how many photos were included.
 */
export async function downloadArchiveBundle(
  rows: ArchiveRow[],
  filenamePrefix: string,
): Promise<{ photos: number }> {
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
  let included = 0;
  for (const photo of photos) {
    try {
      const res = await fetch(photo.url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      photoFolder?.file(photoFileName(photo.application_number, photo.ext), buf);
      included += 1;
    } catch {
      /* a missing photo must not block the records export */
    }
  }

  const sheetRows = rows.map((r): ArchiveSheetRow => {
    const photo = byApplicant.get(r.id);
    return {
      ...r,
      test_score: r.test_score ?? "",
      exam_score: r.exam_score ?? "",
      photo_file: photo ? `photos/${photoFileName(photo.application_number, photo.ext)}` : "",
    };
  });
  zip.file("records.xlsx", await buildWorkbook(sheetRows));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return { photos: included };
}
