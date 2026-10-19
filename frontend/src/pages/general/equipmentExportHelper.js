import {
  getExcelJS,
  downloadExcelWorkbook,
  downloadCsv,
  convertRowsToCsv,
} from "@/lib/excelExportImport";

const EQUIPMENT_COLUMNS = [
  { header: "Category", key: "category", width: 26 },
  { header: "Brand", key: "brand", width: 18 },
  { header: "Model", key: "model", width: 22 },
  { header: "Sequence No", key: "seq_no", width: 16 },
  { header: "Serial Number", key: "serial_number", width: 26 },
  { header: "Barcode", key: "barcode", width: 26 },
  { header: "Status", key: "status", width: 16 },
  { header: "Condition", key: "condition", width: 16 },
  { header: "Date Purchased", key: "purchased_at", width: 18 },
  { header: "Lifespan (Years)", key: "eq_lifespan", width: 18 },
  { header: "Description", key: "description", width: 32 },
];

/**
 * Export current equipment inventory to Excel or CSV
 */
export async function exportEquipmentList(units, format = "xlsx") {
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `Equipment_Inventory_${dateStr}`;

  const rows = units.map((u) => {
    const catName = u.category_name || u.equipment_type?.eq_name || u.equipment_type?.name || u.category || "";
    const seq = u.seq_no ? (String(u.seq_no).startsWith("#") ? String(u.seq_no) : `#${u.seq_no}`) : "";
    const sn = u.serial_number || u.serial_no || u.barcode || "";
    const bc = u.barcode || u.serial_number || "";
    const datePurchased = u.purchased_at || u.date_purchased || "";
    const cleanDate = typeof datePurchased === "string" ? datePurchased.split("T")[0] : "";
    const lifespan = u.eq_lifespan || u.lifespan_years || 5;

    return [
      catName,
      u.brand || "",
      u.model || "",
      seq,
      sn,
      bc,
      u.status || "available",
      u.condition || "Good",
      cleanDate,
      lifespan,
      u.description || "",
    ];
  });

  if (format === "csv") {
    const csvHeaders = EQUIPMENT_COLUMNS.map((c) => c.header);
    const csvContent = convertRowsToCsv([csvHeaders, ...rows]);
    downloadCsv(csvContent, filename);
    return;
  }

  // Export as styled Excel
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Equipment Inventory");

  // Title Row
  worksheet.mergeCells("A1:K1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "FSUU BOOKING SYSTEM - EQUIPMENT INVENTORY";
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" }, // Deep Navy
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 36;

  // Subtitle Row
  worksheet.mergeCells("A2:K2");
  const subCell = worksheet.getCell("A2");
  subCell.value = `Exported on: ${new Date().toLocaleString()} | Total Records: ${units.length}`;
  subCell.font = { italic: true, size: 10, color: { argb: "FF475569" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 20;

  worksheet.getRow(3).height = 10; // Empty spacer

  // Header Row (Row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.height = 28;
  EQUIPMENT_COLUMNS.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" }, // Blue
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF1E40AF" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
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
        horizontal: colIdx === 0 || colIdx === 1 || colIdx === 2 || colIdx === 10 ? "left" : "center",
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
 * Downloads a sample template with sample rows and guidelines for Equipment Import
 */
export async function downloadEquipmentTemplate(format = "xlsx") {
  const filename = "Equipment_Import_Template";

  const sampleRows = [
    [
      "LCD Projector",
      "Epson",
      "EB-E01",
      "#001",
      "SN-2026-EPS-001",
      "SN-2026-EPS-001",
      "available",
      "Good",
      "2026-01-15",
      5,
      "Standard classroom projector with HDMI cable",
    ],
    [
      "Wireless Microphone",
      "Shure",
      "PGXD24",
      "#001",
      "SN-2026-SHU-001",
      "SN-2026-SHU-001",
      "available",
      "Good",
      "2026-02-10",
      3,
      "Dual microphone with receiver set",
    ],
    [
      "Tripod Screen 84\"",
      "Apollo",
      "TS-84",
      "", // Leave blank to test auto-sequence number
      "", // Leave blank to test auto-serial number
      "",
      "available",
      "Good",
      "2026-03-01",
      5,
      "Portable projector tripod screen (auto seq & serial)",
    ],
  ];

  if (format === "csv") {
    const csvHeaders = EQUIPMENT_COLUMNS.map((c) => c.header);
    const csvContent = convertRowsToCsv([csvHeaders, ...sampleRows]);
    downloadCsv(csvContent, filename);
    return;
  }

  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Equipment Template");

  // Instructions header banner
  worksheet.mergeCells("A1:K1");
  const h1 = worksheet.getCell("A1");
  h1.value = "EQUIPMENT BATCH IMPORT TEMPLATE";
  h1.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  h1.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" },
  };
  h1.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 32;

  worksheet.mergeCells("A2:K2");
  const h2 = worksheet.getCell("A2");
  h2.value =
    "Notes: 'Category' is required. 'Serial Number' and 'Sequence No' will be auto-generated if left blank. 'Condition': Good, Damaged, Lost, Under Repair, Minor Wear.";
  h2.font = { italic: true, size: 9, color: { argb: "FF475569" } };
  h2.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 20;

  worksheet.getRow(3).height = 8;

  // Header Row
  const headerRow = worksheet.getRow(4);
  headerRow.height = 26;
  EQUIPMENT_COLUMNS.forEach((col, idx) => {
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
        horizontal: colIdx === 0 || colIdx === 1 || colIdx === 2 || colIdx === 10 ? "left" : "center",
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  await downloadExcelWorkbook(workbook, filename);
}
