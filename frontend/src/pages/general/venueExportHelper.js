import {
  getExcelJS,
  downloadExcelWorkbook,
  downloadCsv,
  convertRowsToCsv,
} from "@/lib/excelExportImport";

const VENUE_COLUMNS = [
  { header: "Venue Name", key: "name", width: 28 },
  { header: "Location", key: "location", width: 28 },
  { header: "Capacity", key: "capacity", width: 14 },
  { header: "Min Capacity", key: "min_capacity", width: 16 },
  { header: "Max Capacity", key: "max_capacity", width: 16 },
  { header: "Status", key: "status", width: 16 },
  { header: "Description", key: "description", width: 36 },
];

/**
 * Export current venue listings to Excel or CSV
 */
export async function exportVenueList(venues, format = "xlsx") {
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `Venues_Directory_${dateStr}`;

  const rows = venues.map((v) => {
    return [
      v.name || "",
      v.location || "",
      v.capacity || v.max_capacity || 100,
      v.min_capacity || 1,
      v.max_capacity || v.capacity || 100,
      v.status || "available",
      v.description || "",
    ];
  });

  if (format === "csv") {
    const csvHeaders = VENUE_COLUMNS.map((c) => c.header);
    const csvContent = convertRowsToCsv([csvHeaders, ...rows]);
    downloadCsv(csvContent, filename);
    return;
  }

  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Venues Directory");

  // Title Row
  worksheet.mergeCells("A1:G1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "FSUU BOOKING SYSTEM - VENUES DIRECTORY";
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 36;

  // Subtitle
  worksheet.mergeCells("A2:G2");
  const subCell = worksheet.getCell("A2");
  subCell.value = `Exported on: ${new Date().toLocaleString()} | Total Venues: ${venues.length}`;
  subCell.font = { italic: true, size: 10, color: { argb: "FF475569" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 20;

  worksheet.getRow(3).height = 10;

  // Header Row
  const headerRow = worksheet.getRow(4);
  headerRow.height = 28;
  VENUE_COLUMNS.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getColumn(idx + 1).width = col.width;
  });

  // Data Rows
  rows.forEach((r, rowIdx) => {
    const row = worksheet.getRow(5 + rowIdx);
    row.height = 22;
    r.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { size: 10 };
      cell.alignment = {
        vertical: "middle",
        horizontal: colIdx === 0 || colIdx === 1 || colIdx === 6 ? "left" : "center",
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (rowIdx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });
  });

  await downloadExcelWorkbook(workbook, filename);
}

/**
 * Downloads a sample template with guidelines for Venue Import
 */
export async function downloadVenueTemplate(format = "xlsx") {
  const filename = "Venues_Import_Template";

  const sampleRows = [
    [
      "Main Auditorium",
      "Arts & Sciences Building, 4th Floor",
      500,
      50,
      500,
      "available",
      "Equipped with stage lighting, sound system, and motorized projection screen.",
    ],
    [
      "Conference Hall A",
      "Administration Complex, 2nd Floor",
      80,
      10,
      80,
      "available",
      "Executive board setup with conference mic and high-speed Wi-Fi.",
    ],
    [
      "AVR 1 (Audio-Visual Room)",
      "Library Building, 1st Floor",
      120,
      15,
      120,
      "available",
      "Tiered classroom seating optimized for video presentations.",
    ],
  ];

  if (format === "csv") {
    const csvHeaders = VENUE_COLUMNS.map((c) => c.header);
    const csvContent = convertRowsToCsv([csvHeaders, ...sampleRows]);
    downloadCsv(csvContent, filename);
    return;
  }

  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Venues Template");

  // Instructions header banner
  worksheet.mergeCells("A1:G1");
  const h1 = worksheet.getCell("A1");
  h1.value = "VENUE FACILITIES BATCH IMPORT TEMPLATE";
  h1.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  h1.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" },
  };
  h1.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 32;

  worksheet.mergeCells("A2:G2");
  const h2 = worksheet.getCell("A2");
  h2.value =
    "Notes: 'Venue Name' is required. If a venue name already exists, its capacity and details will be updated. 'Status': available, maintenance, disabled.";
  h2.font = { italic: true, size: 9, color: { argb: "FF475569" } };
  h2.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 20;

  worksheet.getRow(3).height = 8;

  // Header Row
  const headerRow = worksheet.getRow(4);
  headerRow.height = 26;
  VENUE_COLUMNS.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getColumn(idx + 1).width = col.width;
  });

  // Sample Rows
  sampleRows.forEach((r, rowIdx) => {
    const row = worksheet.getRow(5 + rowIdx);
    row.height = 22;
    r.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { size: 10 };
      cell.alignment = {
        vertical: "middle",
        horizontal: colIdx === 0 || colIdx === 1 || colIdx === 6 ? "left" : "center",
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  await downloadExcelWorkbook(workbook, filename);
}
