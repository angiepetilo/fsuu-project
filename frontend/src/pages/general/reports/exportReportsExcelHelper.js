import { formatDate, formatTimeRange12, formatDateTime } from "@/lib/dateUtils";
import { formatTimeLateFull } from "@/lib/dateTimeUtils";

let _excelJsPromise = null;
async function getExcelJS() {
  if (!_excelJsPromise) {
    _excelJsPromise = import("exceljs").then((m) => m.default || m);
  }
  return _excelJsPromise;
}

/**
 * Styling Constants for FSUU Excel Documents
 */
const COLORS = {
  NAVY_HEADER: "FF1E3A8A",      // Deep Navy Blue
  NAVY_SUBHEADER: "FF1E293B",   // Slate Dark
  TEXT_WHITE: "FFFFFFFF",
  TEXT_DARK: "FF0F172A",
  TEXT_MUTED: "FF64748B",
  BORDER_LIGHT: "FFCBD5E1",
  ZEBRA_BG: "FFF8FAFC",
  WHITE_BG: "FFFFFFFF",
  SECTION_HEADER_BG: "FF2563EB", // Primary Blue
  NOTES_BOX_BG: "FFFEF3C7",       // Amber Note Box
  NOTES_BORDER: "FFD97706",
  KPI_BG: "FFF1F5F9",
  BADGE_GREEN_BG: "FFDCFCE7",
  BADGE_GREEN_TXT: "FF166534",
  BADGE_ROSE_BG: "FFFEE2E2",
  BADGE_ROSE_TXT: "FF991B1B",
  BADGE_AMBER_BG: "FFFEF3C7",
  BADGE_AMBER_TXT: "FF92400E",
  BADGE_BLUE_BG: "FFDBEAFE",
  BADGE_BLUE_TXT: "FF1E40AF",
};

/**
 * Helper to download workbook
 */
async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an off-screen Canvas chart representing Department Violations
 * Returns base64 PNG image data URL.
 */
function generateViolationChartPng(deptSummaryList) {
  try {
    const canvas = document.createElement("canvas");
    const width = 850;
    const height = 380;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Header Area
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 16px Calibri, sans-serif";
    ctx.fillText("DEPARTMENT VIOLATIONS & DAMAGE DISTRIBUTION", 24, 32);

    ctx.fillStyle = "#64748B";
    ctx.font = "12px Calibri, sans-serif";
    ctx.fillText("Aggregated comparative view of venue breaches, late returns, and damaged/lost equipment", 24, 50);

    // Legend
    const legends = [
      { label: "Policy Violations", color: "#2563EB" },
      { label: "Late Returns", color: "#D97706" },
      { label: "Damaged Units", color: "#E11D48" },
      { label: "Lost Units", color: "#7C3AED" },
    ];
    let legendX = 400;
    legends.forEach((item) => {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, 22, 12, 12);
      ctx.fillStyle = "#334155";
      ctx.font = "bold 11px Calibri, sans-serif";
      ctx.fillText(item.label, legendX + 16, 32);
      legendX += 110;
    });

    // Horizontal baseline
    const topY = 80;
    const bottomY = 320;
    const chartHeight = bottomY - topY;
    const leftX = 140;
    const chartWidth = width - leftX - 40;

    // Filter top departments with at least 0 records (up to 6)
    const depts = deptSummaryList.slice(0, 6);
    if (depts.length === 0) {
      ctx.fillStyle = "#94A3B8";
      ctx.font = "italic 14px Calibri, sans-serif";
      ctx.fillText("No department violation records recorded for this term.", 280, 200);
      return canvas.toDataURL("image/png");
    }

    // Determine max value for scale
    let maxVal = 1;
    depts.forEach((d) => {
      const tot = Math.max(d.venue_violations || 0, d.late_returns || 0, d.equipment_damages || 0, d.equipment_lost || 0);
      if (tot > maxVal) maxVal = tot;
    });
    maxVal = Math.ceil(maxVal * 1.25);

    // Grid lines
    const steps = 4;
    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#94A3B8";
    ctx.font = "10px Calibri, sans-serif";
    for (let s = 0; s <= steps; s++) {
      const y = bottomY - (chartHeight / steps) * s;
      const val = Math.round((maxVal / steps) * s);
      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.lineTo(leftX + chartWidth, y);
      ctx.stroke();
      ctx.fillText(String(val), leftX - 25, y + 3);
    }

    // Draw grouped bars for each department
    const groupWidth = chartWidth / depts.length;
    const barWidth = Math.min(groupWidth * 0.18, 22);

    depts.forEach((d, i) => {
      const groupCenterX = leftX + (i + 0.5) * groupWidth;
      
      // Department label
      ctx.fillStyle = "#1E293B";
      ctx.font = "bold 11px Calibri, sans-serif";
      ctx.textAlign = "center";
      const dName = d.department.length > 14 ? d.department.substring(0, 12) + "..." : d.department;
      ctx.fillText(dName, groupCenterX, bottomY + 22);

      // Bars data
      const barData = [
        { val: d.venue_violations || 0, color: "#2563EB" },
        { val: d.late_returns || 0, color: "#D97706" },
        { val: d.equipment_damages || 0, color: "#E11D48" },
        { val: d.equipment_lost || 0, color: "#7C3AED" },
      ];

      const startBarX = groupCenterX - (barData.length * barWidth) / 2;

      barData.forEach((b, bIdx) => {
        const bX = startBarX + bIdx * barWidth;
        const bH = maxVal > 0 ? (b.val / maxVal) * chartHeight : 0;
        const bY = bottomY - bH;

        ctx.fillStyle = b.color;
        ctx.fillRect(bX + 1, bY, barWidth - 2, bH);

        // Value text if > 0
        if (b.val > 0) {
          ctx.fillStyle = "#0F172A";
          ctx.font = "bold 9px Calibri, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(b.val), bX + barWidth / 2, bY - 4);
        }
      });
    });

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("Failed to generate chart image:", err);
    return null;
  }
}

/**
 * Standard University Header Banner across all report tabs
 */
function applyReportHeaderBanner(worksheet, { reportTitle, termLabel, officeScope, maxCol = 9 }) {
  // Row 1: University Header
  worksheet.mergeCells(1, 1, 1, maxCol);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = "FATHER SATURNINO URIOS UNIVERSITY";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: COLORS.TEXT_WHITE } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.NAVY_HEADER } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 28;

  // Row 2: Subtitle / Report Name
  worksheet.mergeCells(2, 1, 2, maxCol);
  const subCell = worksheet.getCell(2, 1);
  subCell.value = "Audio-Visual Room (AVR) Management System — " + reportTitle;
  subCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: COLORS.TEXT_WHITE } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.NAVY_SUBHEADER } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 22;

  // Row 3: Metadata Details
  worksheet.mergeCells(3, 1, 3, maxCol);
  const metaCell = worksheet.getCell(3, 1);
  const genDate = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  metaCell.value = `Academic Term: ${termLabel || "All Academic Terms"}    |    Scope: ${officeScope || "All Offices"}    |    Generated: ${genDate}`;
  metaCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF334155" } };
  metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  metaCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(3).height = 18;

  // Row 4: Spacer
  worksheet.getRow(4).height = 10;
}

/**
 * Inserts a section header title (e.g. "Venue Booking Reports (12 records)")
 */
function insertSectionHeader(worksheet, rowNum, title, recordCount, maxCol = 9) {
  worksheet.mergeCells(rowNum, 1, rowNum, maxCol);
  const cell = worksheet.getCell(rowNum, 1);
  cell.value = recordCount !== undefined ? `${title.toUpperCase()} (${recordCount} records)` : title.toUpperCase();
  cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: COLORS.TEXT_WHITE } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.SECTION_HEADER_BG } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  worksheet.getRow(rowNum).height = 22;
}

/**
 * Inserts a styled report notes callout block
 */
function insertNotesCallout(worksheet, startRow, notesTitle, notesText, maxCol = 9) {
  worksheet.mergeCells(startRow, 1, startRow, maxCol);
  const titleCell = worksheet.getCell(startRow, 1);
  titleCell.value = `📝 ${notesTitle}:`;
  titleCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF92400E" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.NOTES_BOX_BG } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  titleCell.border = {
    top: { style: "thin", color: { argb: COLORS.NOTES_BORDER } },
    left: { style: "thin", color: { argb: COLORS.NOTES_BORDER } },
    right: { style: "thin", color: { argb: COLORS.NOTES_BORDER } },
  };
  worksheet.getRow(startRow).height = 18;

  worksheet.mergeCells(startRow + 1, 1, startRow + 1, maxCol);
  const bodyCell = worksheet.getCell(startRow + 1, 1);
  bodyCell.value = notesText ? `"${notesText}"` : "(No custom audit observations or remarks recorded for this report section.)";
  bodyCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF78350F" } };
  bodyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.NOTES_BOX_BG } };
  bodyCell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
  bodyCell.border = {
    bottom: { style: "thin", color: { argb: COLORS.NOTES_BORDER } },
    left: { style: "thin", color: { argb: COLORS.NOTES_BORDER } },
    right: { style: "thin", color: { argb: COLORS.NOTES_BORDER } },
  };
  worksheet.getRow(startRow + 1).height = 24;
}

/**
 * Styles a table into the worksheet and auto-fits columns
 */
function styleReportTable(worksheet, headerRowIndex, headers, rowsData) {
  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.height = 24;

  headers.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: COLORS.TEXT_WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.NAVY_HEADER } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
      left: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
    };
  });

  rowsData.forEach((row, rowIdx) => {
    const curRowNum = headerRowIndex + 1 + rowIdx;
    const r = worksheet.getRow(curRowNum);
    r.height = 20;
    const isEven = rowIdx % 2 === 1;

    row.forEach((val, colIdx) => {
      const cell = r.getCell(colIdx + 1);
      cell.value = val !== null && val !== undefined ? val : "";
      cell.font = { name: "Calibri", size: 9, color: { argb: COLORS.TEXT_DARK } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? COLORS.ZEBRA_BG : COLORS.WHITE_BG },
      };
      cell.border = {
        top: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        left: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        bottom: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
        right: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
      };

      const strVal = String(val || "");
      if (typeof val === "number" && (colIdx === 0 || strVal.length <= 4)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (
        strVal === "Completed" ||
        strVal === "Good" ||
        strVal === "Satisfactory" ||
        strVal === "Available" ||
        strVal === "Approved"
      ) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: COLORS.BADGE_GREEN_TXT } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BADGE_GREEN_BG } };
      } else if (
        strVal === "Policy Violation" ||
        strVal === "Damaged" ||
        strVal === "Lost" ||
        strVal === "Unavailable" ||
        strVal === "Rejected"
      ) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: COLORS.BADGE_ROSE_TXT } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BADGE_ROSE_BG } };
      } else if (strVal.includes("Late") || strVal === "Pending" || strVal === "Under Repair") {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: COLORS.BADGE_AMBER_TXT } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BADGE_AMBER_BG } };
      } else if (strVal.startsWith("TRK-") || strVal.startsWith("EQ-") || strVal.startsWith("BC-") || strVal.startsWith("SN-")) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { name: "Consolas", size: 9, bold: true, color: { argb: "FF1E293B" } };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });
  });

  // Adjust column widths if not already wider
  headers.forEach((h, colIdx) => {
    let maxLen = h.length;
    rowsData.forEach((row) => {
      const val = row[colIdx];
      if (val !== null && val !== undefined) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    const col = worksheet.getColumn(colIdx + 1);
    const calculatedWidth = Math.min(Math.max(maxLen + 3, 11), 40);
    if (!col.width || col.width < calculatedWidth) {
      col.width = calculatedWidth;
    }
  });

  return headerRowIndex + 1 + rowsData.length;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT FUNCTION: Generates multi-tab master Excel report
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function exportReportsToExcel({
  venueBookings = [],
  equipmentBorrowings = [],
  activeEquipmentBorrowings = [],
  ruleViolations = [],
  inventoryItems = [],
  equipmentUnits = [],
  termLabel = "",
  officeScope = "All Offices",
  activeTab = "all", // "all" | "booking_borrowing" | "breaches" | "inventory" | "equipment_out" | "incident_reports"
}) {
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Father Saturnino Urios University - AVR Management";
  workbook.created = new Date();

  const currentVenueNotes = localStorage.getItem("fsuu_report_venue_notes") || "";
  const currentEquipNotes = localStorage.getItem("fsuu_report_equipment_notes") || "";
  const currentBreachesNotes = localStorage.getItem("fsuu_report_breaches_notes") || "";

  // ═════════════════════════════════════════════════════════════════════════════
  // SHEET 1: Bookings & Loans Report
  // ═════════════════════════════════════════════════════════════════════════════
  if (activeTab === "all" || activeTab === "booking_borrowing") {
    const ws1 = workbook.addWorksheet("Bookings & Loans", {
      views: [{ showGridLines: true }],
    });

    applyReportHeaderBanner(ws1, {
      reportTitle: "Booking & Borrowing Activity Report",
      termLabel,
      officeScope,
      maxCol: 8,
    });

    // 1. Venue Booking Section
    let curRow = 5;
    insertSectionHeader(ws1, curRow, "Venue Booking Reports", venueBookings.length, 8);
    curRow += 1;

    const venueHeaders = [
      "#", "TRACK NO.", "REQUESTOR", "DEPARTMENT", "VENUE", "DATE", "TIME", "STATUS & NOTE"
    ];
    const venueRows = venueBookings.map((b, idx) => {
      const ref = b.reference_code || b.tracking_number?.reference_code || `TRK-AVR${b.id}`;
      const name = b.filer_name || b.applicant_name || [b.first_name, b.last_name].filter(Boolean).join(" ") || "N/A";
      const dept = b.program_office || b.department || "Academic Dept";
      const venue = b.venue_name || b.venue?.name || "AVR Facility";
      const date = formatDate(b.date_of_usage || b.start_datetime || b.date);
      const time = formatTimeRange12(b.time_start || b.start_time, b.time_end || b.end_time);
      const note = b.inspection_notes || b.notes || b.rejection_reason || b.status || "Completed";
      return [idx + 1, ref, name, dept, venue, date, time, note];
    });

    curRow = styleReportTable(ws1, curRow, venueHeaders, venueRows);
    curRow += 1;

    // Venue Notes Callout
    insertNotesCallout(ws1, curRow, "Venue Report Notes & Observations", currentVenueNotes, 8);
    curRow += 3;

    // 2. Equipment Borrowing Section
    insertSectionHeader(ws1, curRow, "Equipment Borrowing Reports", equipmentBorrowings.length, 10);
    curRow += 1;

    const equipHeaders = [
      "#", "TRACK NO.", "REQUESTOR", "DEPARTMENT", "EQUIPMENT", "DATE", "TIME", "LATE RETURN", "TIME LATE", "STATUS & NOTE"
    ];
    const equipRows = equipmentBorrowings.map((eb, idx) => {
      const ref = eb.reference_code || eb.tracking_number?.reference_code || `EQ-${eb.id}`;
      const name = eb.filer_name || eb.requestor || "N/A";
      const dept = eb.program_office || eb.department || "Academic Dept";
      const eqName = eb.items?.[0]?.equipmentType?.name || eb.equipment_name || "Equipment Item";
      const date = formatDate(eb.date_of_usage || eb.borrow_date || eb.created_at);
      const time = formatTimeRange12(eb.time_start, eb.time_end);
      const isLate = Boolean(eb.is_late) || String(eb.timeliness || "").toLowerCase().includes("late");
      const timeLate = isLate ? formatTimeLateFull(eb.minutes_late || 0) : "On Time";
      const note = eb.inspection_notes || eb.notes || eb.status || "Completed";
      return [
        idx + 1, ref, name, dept, eqName, date, time, isLate ? "Yes" : "No", timeLate, note
      ];
    });

    curRow = styleReportTable(ws1, curRow, equipHeaders, equipRows);
    curRow += 1;

    // Equipment Notes Callout
    insertNotesCallout(ws1, curRow, "Equipment Borrowing Report Notes", currentEquipNotes, 10);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SHEET 2: Rule & Late Return Violations (Breaches + Incidents + Graph)
  // ═════════════════════════════════════════════════════════════════════════════
  if (activeTab === "all" || activeTab === "breaches") {
    const ws2 = workbook.addWorksheet("Violations & Incidents", {
      views: [{ showGridLines: true }],
    });

    applyReportHeaderBanner(ws2, {
      reportTitle: "Rule Violations, Late Returns & Equipment Damages",
      termLabel,
      officeScope,
      maxCol: 7,
    });

    // 1. Department Violation Summary calculation
    const deptMap = {};
    const seedDept = (rawDept) => {
      const d = String(rawDept || "Academic Dept").trim();
      if (!deptMap[d]) {
        deptMap[d] = { department: d, venue_violations: 0, late_returns: 0, equipment_damages: 0, equipment_lost: 0 };
      }
    };

    venueBookings.forEach((b) => seedDept(b.program_office || b.department));
    equipmentBorrowings.forEach((eb) => seedDept(eb.program_office || eb.department));

    // Calculate counts
    venueBookings.forEach((b) => {
      const d = String(b.program_office || b.department || "Academic Dept").trim();
      const st = String(b.status || "").toLowerCase();
      if (st.includes("violation") || b.has_damage || st === "damaged") {
        deptMap[d].venue_violations += 1;
      }
    });

    equipmentBorrowings.forEach((eb) => {
      const d = String(eb.program_office || eb.department || "Academic Dept").trim();
      const st = String(eb.status || "").toLowerCase();
      if (eb.is_late || st.includes("late")) {
        deptMap[d].late_returns += 1;
      }
      if (st === "damaged" || eb.has_damage) {
        deptMap[d].equipment_damages += 1;
      }
      if (st === "lost") {
        deptMap[d].equipment_lost += 1;
      }
    });

    const deptSummaryList = Object.values(deptMap);

    let curRow = 5;
    insertSectionHeader(ws2, curRow, "Department Violation Summary", deptSummaryList.length, 7);
    curRow += 1;

    const summaryHeaders = [
      "#", "DEPARTMENT", "POLICY VIOLATION", "LATE RETURNS", "DAMAGED UNITS", "LOST UNITS", "EQUIPMENT VIOLATION SUMMARY"
    ];
    const summaryRows = deptSummaryList.map((d, idx) => {
      const eqViolSummary = `${d.late_returns} Late, ${d.equipment_damages} Damaged, ${d.equipment_lost} Lost`;
      return [
        idx + 1,
        d.department,
        d.venue_violations,
        d.late_returns,
        d.equipment_damages,
        d.equipment_lost,
        eqViolSummary,
      ];
    });

    curRow = styleReportTable(ws2, curRow, summaryHeaders, summaryRows);
    curRow += 2;

    // 2. Incident & Damages Detail Table
    insertSectionHeader(ws2, curRow, "Incident and Damages View", 0, 7);
    curRow += 1;

    const incidentHeaders = [
      "REFERENCE", "INCIDENT TYPE", "REQUESTOR & DEPARTMENT", "FACILITY / ITEM", "BREACH & DAMAGE DETAILS", "DATE"
    ];

    const incidentRows = [];
    venueBookings
      .filter((b) => {
        const s = (b.status || "").toLowerCase();
        return Boolean(b.violation) || Boolean(b.violation_type) || s === "violation" || s === "damaged" || Boolean(b.has_damage);
      })
      .forEach((b) => {
        const ref = b.reference_code || `TRK-AVR${b.id}`;
        const name = `${b.filer_name || b.applicant_name || "Applicant"} (${b.program_office || b.department || "Dept"})`;
        const item = b.venue_name || b.venue?.name || "AVR Facility";
        const details = b.inspection_notes || b.notes || b.violation_type || "Venue policy breach";
        const date = formatDate(b.date_of_usage || b.created_at);
        incidentRows.push([ref, "Venue Policy Violation", name, item, details, date]);
      });

    equipmentBorrowings
      .filter((eb) => {
        const s = (eb.status || "").toLowerCase();
        return Boolean(eb.is_late) || s.includes("late") || s === "damaged" || s === "lost" || Boolean(eb.has_damage);
      })
      .forEach((eb) => {
        const ref = eb.reference_code || `EQ-${eb.id}`;
        const name = `${eb.filer_name || eb.requestor || "Borrower"} (${eb.program_office || eb.department || "Dept"})`;
        const item = eb.items?.[0]?.equipmentType?.name || eb.equipment_name || "Equipment Item";
        const isLate = Boolean(eb.is_late) || String(eb.status || "").includes("late");
        const type = isLate ? "Late Return Violation" : (eb.status === "lost" ? "Equipment Lost" : "Equipment Damage");
        const details = eb.inspection_notes || eb.notes || eb.violation_type || type;
        const date = formatDate(eb.date_of_usage || eb.created_at);
        incidentRows.push([ref, type, name, item, details, date]);
      });

    curRow = styleReportTable(ws2, curRow, incidentHeaders, incidentRows);
    curRow += 2;

    // 3. Embedded Canvas Graphic Chart (Bar Chart of Department Violations)
    const chartPng = generateViolationChartPng(deptSummaryList);
    if (chartPng) {
      try {
        const imageId = workbook.addImage({
          base64: chartPng,
          extension: "png",
        });

        worksheetAddHeaderLabel(ws2, curRow, "DEPARTMENT VIOLATION DISTRIBUTION GRAPH / CHART", 7);
        curRow += 1;

        // Position the chart image directly under the table
        ws2.addImage(imageId, {
          tl: { col: 0.5, row: curRow - 0.5 },
          ext: { width: 720, height: 320 },
        });

        // Reserve rows for the image space
        curRow += 18;
      } catch (err) {
        console.error("Could not add chart image to worksheet:", err);
      }
    }

    // 4. Violation Notes Callout
    insertNotesCallout(ws2, curRow, "Rule & Late Return Violations Audit Notes", currentBreachesNotes, 7);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SHEET 3: Equipment Inventory and Stock
  // ═════════════════════════════════════════════════════════════════════════════
  if (activeTab === "all" || activeTab === "inventory") {
    const ws3 = workbook.addWorksheet("Equipment Inventory", {
      views: [{ showGridLines: true }],
    });

    applyReportHeaderBanner(ws3, {
      reportTitle: "AVR Equipment Inventory & Stock Audit",
      termLabel,
      officeScope,
      maxCol: 9,
    });

    // 1. Category Stock Audit Table
    let curRow = 5;
    insertSectionHeader(ws3, curRow, "Category Stock Audit", inventoryItems.length, 9);
    curRow += 1;

    const catHeaders = [
      "EQUIPMENT CATEGORY", "TOTAL", "AVAILABLE", "BUILT-IN", "UNAVAILABLE", "RESERVED", "RELEASED", "DAMAGED", "LOST"
    ];
    const catRows = inventoryItems.map((it) => {
      const name = it.name || it.eq_name || it.eq_type || "Equipment";
      const total = it.total_quantity ?? it.total ?? 0;
      const avail = it.available_count ?? it.available ?? 0;
      const builtIn = it.built_in_count ?? it.built_in ?? 0;
      const unavail = it.unavailable_count ?? it.unavailable ?? 0;
      const reserved = it.reserved_count ?? it.reserved ?? 0;
      const released = it.released_count ?? it.released ?? 0;
      const damaged = it.damaged_count ?? it.damaged ?? 0;
      const lost = it.lost_count ?? it.lost ?? 0;
      return [name, total, avail, builtIn, unavail, reserved, released, damaged, lost];
    });

    curRow = styleReportTable(ws3, curRow, catHeaders, catRows);
    curRow += 2;

    // 2. Physical Equipment Units Table
    insertSectionHeader(ws3, curRow, "Physical Equipment Units", equipmentUnits.length, 10);
    curRow += 1;

    const unitHeaders = [
      "#", "SERIAL NO. / BARCODE", "EQUIPMENT UNIT NAME", "CATEGORY", "OFFICE", "BUILT-IN", "STATUS", "CONDITION", "PURCHASED", "LIFESPAN"
    ];
    const unitRows = equipmentUnits.map((u, idx) => {
      const barcode = u.barcode || `BC-${u.id}`;
      const name = u.name || "Equipment Unit";
      const cat = u.category || "AV Equipment";
      const off = u.office_name || "AVR Office";
      const builtIn = u.built_in_units ? "Yes" : "None";
      const status = u.status || "Available";
      const cond = u.condition || "Good";
      const datePurchased = u.date_purchased || "N/A";
      const lifespan = u.lifespan_years ? `${u.lifespan_years} yrs` : "5 yrs";
      return [
        idx + 1, barcode, name, cat, off, builtIn, status, cond, datePurchased, lifespan
      ];
    });

    curRow = styleReportTable(ws3, curRow, unitHeaders, unitRows);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SHEET 4: Equipment Out (Active Loans & Tracking)
  // ═════════════════════════════════════════════════════════════════════════════
  if (activeTab === "all" || activeTab === "equipment_out") {
    const ws4 = workbook.addWorksheet("Equipment Out", {
      views: [{ showGridLines: true }],
    });

    applyReportHeaderBanner(ws4, {
      reportTitle: "Active Equipment Out & Loans Tracking",
      termLabel,
      officeScope,
      maxCol: 9,
    });

    let curRow = 5;
    insertSectionHeader(ws4, curRow, "Equipment Out (Released & Active Loans)", activeEquipmentBorrowings.length, 9);
    curRow += 1;

    const outHeaders = [
      "#", "BORROWER / REQUESTOR", "DEPARTMENT", "EQUIPMENT ITEM", "UNITS", "BARCODE(S)", "BORROW DATE", "EXPECTED / RETURN TIME", "STATUS"
    ];

    const outRows = activeEquipmentBorrowings.map((b, idx) => {
      const borrower = b.filer_name || b.requestor || "Borrower";
      const dept = b.program_office || b.department || "Academic Dept";
      const eqItem = b.items?.[0]?.equipmentType?.name || b.equipment_name || "Equipment Item";
      const unitsCount = b.items?.length || b.quantity || 1;
      
      let barcodes = "N/A";
      if (b.assigned_units) {
        if (typeof b.assigned_units === "object") {
          barcodes = Object.values(b.assigned_units).filter(Boolean).join(", ");
        } else {
          barcodes = String(b.assigned_units);
        }
      }

      const borrowDate = formatDate(b.date_of_usage || b.borrow_date || b.created_at);
      const expectedTime = formatTimeRange12(b.time_start, b.time_end);
      const status = b.status || "Out on Loan";

      return [
        idx + 1, borrower, dept, eqItem, unitsCount, barcodes, borrowDate, expectedTime, status
      ];
    });

    styleReportTable(ws4, curRow, outHeaders, outRows);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SHEET 5: Incident & Damage Reports
  // ═════════════════════════════════════════════════════════════════════════════
  if (activeTab === "all" || activeTab === "incident_reports") {
    const ws5 = workbook.addWorksheet("Incident & Damage Logs", {
      views: [{ showGridLines: true }],
    });

    applyReportHeaderBanner(ws5, {
      reportTitle: "Incident & Damage Reports Audit Log",
      termLabel,
      officeScope,
      maxCol: 7,
    });

    let curRow = 5;
    insertSectionHeader(ws5, curRow, "Audit & Incident Report Log", 0, 7);
    curRow += 1;

    const incHeaders = [
      "#", "TRACK / REF NO.", "TARGET / FACILITY / ITEM", "REPORT TYPE", "CONDITION", "DATE FILED", "REMARKS / NOTES"
    ];

    const incRows = [];
    venueBookings.forEach((b, idx) => {
      if (b.status === "damaged" || b.has_damage || b.violation) {
        incRows.push([
          incRows.length + 1,
          b.reference_code || `TRK-AVR${b.id}`,
          b.venue_name || "AVR Venue",
          "Venue Policy Breach",
          b.status || "Violation",
          formatDate(b.date_of_usage || b.created_at),
          b.inspection_notes || b.notes || "Reported violation",
        ]);
      }
    });

    equipmentBorrowings.forEach((eb) => {
      if (eb.is_late || eb.status === "damaged" || eb.status === "lost") {
        incRows.push([
          incRows.length + 1,
          eb.reference_code || `EQ-${eb.id}`,
          eb.equipment_name || "Equipment Item",
          eb.is_late ? "Late Equipment Return" : (eb.status === "lost" ? "Equipment Lost" : "Equipment Damage"),
          eb.status || "Damaged",
          formatDate(eb.date_of_usage || eb.created_at),
          eb.inspection_notes || eb.notes || "Inspection reported",
        ]);
      }
    });

    styleReportTable(ws5, curRow, incHeaders, incRows);
  }

  const cleanPrefix = termLabel
    ? termLabel.replace(/\s*AY\s*[\d\-/]+.*$/i, "").replace(/[\\/:*?"<>|]/g, "").trim()
    : "All_Terms";
  const filename = `FSUU_Reports_${cleanPrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await downloadWorkbook(workbook, filename);
}

function worksheetAddHeaderLabel(worksheet, rowNum, title, maxCol = 7) {
  worksheet.mergeCells(rowNum, 1, rowNum, maxCol);
  const cell = worksheet.getCell(rowNum, 1);
  cell.value = `📊 ${title}`;
  cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: COLORS.TEXT_WHITE } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  worksheet.getRow(rowNum).height = 20;
}
