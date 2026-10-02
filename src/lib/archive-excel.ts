import type { ArchiveRow } from "./admin.functions";

/**
 * The single Excel schema used whenever past records are downloaded before
 * deletion. Keeping it in one place means the stale-applicant prompt and the
 * storage clean-up panel always produce the same workbook.
 */
export const ARCHIVE_COLUMNS: { header: string; key: keyof ArchiveRow; width: number }[] = [
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
];

/** Builds an .xlsx download from past records. `exceljs` is loaded on demand. */
export async function downloadArchiveExcel(
  rows: ArchiveRow[],
  filenamePrefix: string,
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Past records");
  ws.columns = ARCHIVE_COLUMNS;
  ws.addRows(
    rows.map((r) => ({ ...r, test_score: r.test_score ?? "", exam_score: r.exam_score ?? "" })),
  );
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
