import ExcelJS from "exceljs";
import {
  formatDate,
  formatTimeRange,
  formatDateTime,
  formatDateRange,
} from "@/lib/dateUtils";
import { formatPhilippineNumber } from "@/lib/phoneValidation";
import {
  getVenueOutcome,
  getEquipmentOutcome,
} from "./exportHistoryCsvHelper";

/**
 * Builds the file name prefix from the academic term.
 */
function termPrefix(termLabel) {
  const clean = String(termLabel || "")
    .replace(/\s*AY\s*[\d\-/]+.*$/i, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
  return clean || "All Terms";
}

function formatReturnParts(raw) {
  if (!raw) return { date: "", time: "" };
  const d = new Date(String(raw).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return {
    date: d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
  };
}

function toPhotoList(b) {
  if (Array.isArray(b.evidence_photos) && b.evidence_photos.length) return b.evidence_photos;
  if (b.evidence_photo) return [b.evidence_photo];
  return [];
}

function resolveUnits(b) {
  if (Array.isArray(b.unit_details) && b.unit_details.length > 0) {
    return b.unit_details.map((u) => ({
      equipment: u.equipment_name || b.equipment_name || "Equipment",
      serial: u.serial_number || u.barcode || "",
    }));
  }

  let assigned = b.assigned_units;
  if (typeof assigned === "string") {
    try {
      assigned = JSON.parse(assigned);
    } catch {
      assigned = null;
    }
  }
  const values = Array.isArray(assigned)
    ? assigned
    : assigned && typeof assigned === "object"
    ? Object.values(assigned)
    : [];
  if (values.length > 0) {
    return values.map((v) => ({ equipment: b.equipment_name || b.equipment || "Equipment", serial: String(v) }));
  }

  const rows = [];
  const items = Array.isArray(b.items) ? b.items : [];
  if (items.length > 0) {
    items.forEach((it) => {
      const qty = Number(it.quantity_requested || 1);
      for (let i = 0; i < qty; i++) {
        rows.push({ equipment: it.equipment_name || it.equipment_type?.name || "Equipment", serial: "" });
      }
    });
    return rows;
  }
  return [{ equipment: b.equipment_name || b.equipment || "Equipment", serial: "" }];
}

function getRequestedEquipmentSummary(b) {
  if (Array.isArray(b.equipment_items) && b.equipment_items.length > 0) {
    return b.equipment_items
      .map(
        (it) =>
          `${it.name || it.category || "Equipment"} (${it.quantity || 1} ${
            Number(it.quantity || 1) === 1 ? "unit" : "units"
          })`
      )
      .join(", ");
  }

  if (Array.isArray(b.assigned_unit_details) && b.assigned_unit_details.length > 0) {
    const counts = {};
    b.assigned_unit_details.forEach((u) => {
      const cat = u.category || "Equipment";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([cat, qty]) => `${cat} (${qty} ${qty === 1 ? "unit" : "units"})`)
      .join(", ");
  }

  if (b.equipment_types) {
    if (typeof b.equipment_types === "string") {
      try {
        const parsed = JSON.parse(b.equipment_types);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p) => (typeof p === "string" ? p : p.name || p.category)).filter(Boolean).join(", ");
        }
      } catch {}
      return b.equipment_types;
    }
  }

  return "None";
}

function getAssignedUnitsSummary(b) {
  if (Array.isArray(b.assigned_unit_details) && b.assigned_unit_details.length > 0) {
    return b.assigned_unit_details
      .map((u) => `${u.slot || "Unit"}: [${u.barcode}]${u.category ? ` (${u.category})` : ""}`)
      .join(" | ");
  }

  let assigned = b.assigned_units;
  if (!assigned && b.id) {
    try {
      const saved =
        localStorage.getItem(`fsuu_assigned_units_${b.id}`) ||
        localStorage.getItem(`fsuu_completed_assigned_units_${b.id}`);
      if (saved) assigned = JSON.parse(saved);
    } catch {}
  }
  if (typeof assigned === "string") {
    try {
      assigned = JSON.parse(assigned);
    } catch {
      return assigned;
    }
  }
  if (Array.isArray(assigned)) {
    return assigned
      .map((u, i) => `Unit #${i + 1} [${typeof u === "object" ? u.barcode || u.serial_number : u}]`)
      .join(" | ");
  }
  if (assigned && typeof assigned === "object") {
    const entries = Object.entries(assigned).filter(([_, v]) => Boolean(v));
    if (entries.length > 0) {
      return entries.map(([_, v], i) => `Unit #${i + 1} [${v}]`).join(" | ");
    }
  }
  return "None Assigned";
}

function getUnitConditionsSummary(b) {
  if (Array.isArray(b.assigned_unit_details) && b.assigned_unit_details.length > 0) {
    return b.assigned_unit_details
      .map((u) => `${u.slot || "Unit"} [${u.barcode}]: ${u.condition || "Good"}`)
      .join(" | ");
  }

  let conds = b.unit_conditions;
  if (!conds && b.id) {
    try {
      const saved = localStorage.getItem(`fsuu_unit_conditions_${b.id}`);
      if (saved) conds = JSON.parse(saved);
    } catch {}
  }
  if (typeof conds === "string") {
    try {
      conds = JSON.parse(conds);
    } catch {}
  }
  if (conds && typeof conds === "object") {
    const entries = Object.entries(conds);
    if (entries.length > 0) {
      return entries
        .map(([k, v]) => `[${k}]: ${typeof v === "object" ? v.condition || v.status : v}`)
        .join(" | ");
    }
  }
  return b.inspection_condition ? `All units: ${b.inspection_condition}` : "Satisfactory / Good";
}

function getBuiltInComponentsSummary(b) {
  if (Array.isArray(b.assigned_unit_details) && b.assigned_unit_details.length > 0) {
    const allBi = [];
    b.assigned_unit_details.forEach((u) => {
      (u.built_ins || []).forEach((bi) => {
        allBi.push(`${bi.name} [${bi.barcode}]`);
      });
    });
    if (allBi.length > 0) {
      return Array.from(new Set(allBi)).join(" | ");
    }
  }
  return "None";
}

function getEquipmentRemarks(b) {
  return (
    b.equipment_notes ||
    b.equipment_inspection_remarks ||
    "All physical units inspected in satisfactory condition."
  );
}

function getOvertimeTurnover(b) {
  const mins =
    Number(b.minutes_overdue || b.minutes_late || 0) ||
    Number(b.overtime_minutes || 0);
  if (mins > 0) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `Facility event ended ${hrs > 0 ? `${hrs}h ` : ""}${rem}m overdue past scheduled time.`;
  }
  if (b.overtime_turnover) return b.overtime_turnover;
  return "On-time turnover upon session conclusion.";
}

function getVenueInspectionOutcome(b) {
  const st = (b.status || "").toLowerCase();
  const cond = (b.inspection_condition || "").toLowerCase();
  const hasDamage =
    b.has_damage === true ||
    b.has_damage === 1 ||
    b.has_damage === "1" ||
    String(b.has_damage).toLowerCase() === "true";
  const hasViolation =
    b.violation === true ||
    b.violation === 1 ||
    b.violation === "1" ||
    (typeof b.violation === "string" && b.violation.length > 0 && b.violation !== "null");

  if (st === "damaged" || hasDamage || cond === "damaged") {
    return "Damaged (Equipment / Facility Breach)";
  }
  if (st === "solved") return "Solved";
  if (hasViolation || st === "violation") return "Policy Violation";
  return "Satisfactory";
}

function getVenueViolationCategory(b) {
  return (
    b.violation_type ||
    b.violation ||
    (b.has_damage ? "Damaged Equipment Unit" : "None")
  );
}

function getVenueInspectionNotes(b) {
  return (
    b.inspection_notes ||
    b.venue_notes ||
    b.notes ||
    "Facility returned in clean, orderly condition."
  );
}

function getRejectionConflictReason(b) {
  if (b.is_auto_rejected) {
    return b.auto_reject_winning_reference
      ? `System Auto-Conflict Resolution: Slot granted to ${b.auto_reject_winning_reference}`
      : "System Auto-Conflict Resolution: Prior schedule conflict";
  }
  return b.rejection_reason || b.conflict_reason || b.remarks || "";
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
  BANNER_BG: "FF0F172A",
  BANNER_SUB_BG: "FF1E3A8A",
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
 * Applies university title banner at the top of a worksheet
 */
function applyUniversityHeaderBanner(worksheet, { title, subtitle, termLabel, recordCount, maxCol = 10 }) {
  // Row 1: University Header
  worksheet.mergeCells(1, 1, 1, maxCol);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = "FATHER SATURNINO URIOS UNIVERSITY";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: COLORS.TEXT_WHITE } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.NAVY_HEADER } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 28;

  // Row 2: Subtitle / System Name
  worksheet.mergeCells(2, 1, 2, maxCol);
  const subCell = worksheet.getCell(2, 1);
  subCell.value = "Audio-Visual Room (AVR) Management System — " + title;
  subCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: COLORS.TEXT_WHITE } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BANNER_BG } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 22;

  // Row 3: Metadata Details (Term, Generated Date, Count)
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
  metaCell.value = `Academic Term: ${termLabel || "All Academic Terms"}    |    Generated: ${genDate}    |    Total Records: ${recordCount}`;
  metaCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF334155" } };
  metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  metaCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(3).height = 18;

  // Row 4: Spacer
  worksheet.getRow(4).height = 8;
}

/**
 * Downloads an ExcelJS workbook buffer to the user's browser.
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
 * Formats a styled table into a worksheet.
 */
function styleTableRows(worksheet, startRow, headers, rowsData) {
  // Header row
  const headerRow = worksheet.getRow(startRow);
  headerRow.height = 26;
  headers.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: COLORS.TEXT_WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.NAVY_HEADER } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
      left: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: COLORS.BORDER_LIGHT } },
    };
  });

  // Data rows
  rowsData.forEach((row, rowIdx) => {
    const currentRowNum = startRow + 1 + rowIdx;
    const r = worksheet.getRow(currentRowNum);
    r.height = 20;
    const isEven = rowIdx % 2 === 1;

    row.forEach((val, colIdx) => {
      const cell = r.getCell(colIdx + 1);
      cell.value = val !== null && val !== undefined ? val : "";
      cell.font = { name: "Calibri", size: 9.5, color: { argb: COLORS.TEXT_DARK } };
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

      // Alignment rules based on content
      const strVal = String(val || "");
      if (colIdx === 0 && typeof val === "number") {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (
        strVal === "Good" ||
        strVal === "Completed" ||
        strVal === "Satisfactory" ||
        strVal === "Solved" ||
        strVal === "Verified" ||
        strVal === "Approved"
      ) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: COLORS.BADGE_GREEN_TXT } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BADGE_GREEN_BG } };
      } else if (
        strVal === "Policy Violation" ||
        strVal === "Damaged" ||
        strVal === "Lost" ||
        strVal.includes("Damaged") ||
        strVal === "Rejected"
      ) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: COLORS.BADGE_ROSE_TXT } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BADGE_ROSE_BG } };
      } else if (strVal.includes("Late") || strVal === "Pending" || strVal === "Cancelled") {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: COLORS.BADGE_AMBER_TXT } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BADGE_AMBER_BG } };
      } else if (
        strVal.startsWith("TRK-") ||
        strVal.startsWith("EQ-") ||
        strVal.startsWith("BC-") ||
        strVal.startsWith("SN-")
      ) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { name: "Consolas", size: 9, bold: true, color: { argb: "FF1E293B" } };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: false };
      }
    });
  });

  // Auto-fit column widths
  headers.forEach((h, colIdx) => {
    let maxLen = h.length;
    rowsData.forEach((row) => {
      const val = row[colIdx];
      if (val !== null && val !== undefined) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    // Set column width with safety caps
    const col = worksheet.getColumn(colIdx + 1);
    const calculatedWidth = Math.min(Math.max(maxLen + 3, 10), 45);
    col.width = calculatedWidth;
  });
}

/**
 * Builds rows for Venue Bookings History table.
 */
function buildVenueRows(records) {
  return records.map((b, idx) => {
    const refCode =
      b.reference_code ||
      b.tracking_number?.reference_code ||
      (typeof b.tracking_number === "string" ? b.tracking_number : "") ||
      `TRK-AVR${b.id}`;

    const venueReserved = b.venue_name || b.venue?.name || b.venue || "N/A";
    const timeAndDateFiled = formatDateTime(b.created_at) || "";
    const status = getVenueOutcome(b);

    const applicantName =
      [b.first_name, b.middle_name, b.last_name, b.suffix].filter(Boolean).join(" ").trim() ||
      b.applicant_name ||
      b.filer_name ||
      b.requestor ||
      "N/A";

    const rawClass = b.classification || b.role || b.applicant_type || "Student";
    const identity =
      rawClass.toLowerCase() === "student"
        ? "Student"
        : rawClass.toLowerCase().includes("fac")
        ? "Faculty"
        : "External";

    const emailAddress = b.email_address || b.email || "";
    const isEmailVerified =
      b.is_email_verified === true ||
      b.is_email_verified === 1 ||
      b.is_email_verified === "1" ||
      b.is_email_verified === undefined ||
      b.is_email_verified === null;
    const emailVerified = isEmailVerified ? "Verified" : "Unverified";

    const contactNumber =
      formatPhilippineNumber(b.contact_no || b.contact_number || b.phone) ||
      b.contact_no ||
      b.contact_number ||
      "";

    const departmentOffice = b.program_office || b.department || "N/A";

    const dateRange = formatDateRange(
      b.date_of_usage || b.start_datetime || b.date,
      b.reservation_end_date || b.end_datetime || b.end_date
    );

    const timeRange = formatTimeRange(
      b.time_start || b.start_time || b.start_datetime,
      b.time_end || b.end_time || b.end_datetime
    );

    const purpose = b.purpose || b.activity_name || b.event_name || "";
    const requestedEquipment = getRequestedEquipmentSummary(b);

    const endorsementDoc =
      b.endorsement_file || b.endorsement_attachment
        ? "Endorsement Document Attached"
        : b.is_endorsement_received || b.physical_hardcopy_received
        ? "Physical Hardcopy Received"
        : "No Endorsement Document";

    const assignedUnits = getAssignedUnitsSummary(b);
    const unitConditions = getUnitConditionsSummary(b);
    const builtInComponents = getBuiltInComponentsSummary(b);
    const equipmentRemarks = getEquipmentRemarks(b);
    const overtimeTurnover = getOvertimeTurnover(b);
    const inspectionOutcomeStatus = getVenueInspectionOutcome(b);
    const violationCategory = getVenueViolationCategory(b);
    const venueInspectionNotes = getVenueInspectionNotes(b);
    const evidencePhotos = toPhotoList(b).join(" | ");
    const conflictOrReason = getRejectionConflictReason(b);

    return [
      idx + 1,
      refCode,
      venueReserved,
      timeAndDateFiled,
      status,
      applicantName,
      identity,
      emailAddress,
      emailVerified,
      contactNumber,
      departmentOffice,
      dateRange,
      timeRange,
      purpose,
      requestedEquipment,
      endorsementDoc,
      assignedUnits,
      unitConditions,
      builtInComponents,
      equipmentRemarks,
      overtimeTurnover,
      inspectionOutcomeStatus,
      violationCategory,
      venueInspectionNotes,
      evidencePhotos,
      conflictOrReason,
      formatDate(b.created_at) || "",
      formatDate(b.updated_at) || "",
    ];
  });
}

/**
 * Builds rows for Equipment Borrowings History table.
 */
function buildEquipmentRows(records) {
  const rows = [];
  let n = 1;

  records.forEach((b) => {
    const refCode =
      b.reference_code ||
      b.tracking_number?.reference_code ||
      (typeof b.tracking_number === "string" ? b.tracking_number : "") ||
      `EQUIP-REQ-${b.id}`;
    const outcome = getEquipmentOutcome(b);
    const ret = formatReturnParts(b.returned_at || b.post_inspected_at);
    const breachDetails = b.rejection_reason || b.violation_type || b.violation || b.remarks || "";
    const photos = toPhotoList(b).join(" | ");

    resolveUnits(b).forEach((u) => {
      rows.push([
        n++,
        refCode,
        b.filer_name || b.requestor || "N/A",
        b.program_office || b.department || "N/A",
        b.email_address || "",
        b.contact_no || b.contact_number || "",
        u.equipment,
        u.serial,
        1,
        formatDate(b.date_of_usage || b.date),
        formatTimeRange(b.time_start, b.time_end),
        b.purpose || "",
        ret.date,
        ret.time,
        outcome,
        breachDetails,
        b.inspection_notes || b.notes || "",
        photos,
        formatDate(b.created_at) || "",
        formatDate(b.updated_at) || "",
      ]);
    });
  });

  return rows;
}

const VENUE_HEADERS = [
  "#",
  "Track Number",
  "Venue Reserved",
  "Time and Date Filed",
  "Status",
  "Applicant Name",
  "Identity",
  "Email Address",
  "Email Verified",
  "Contact Number",
  "Department / Office",
  "Date Range",
  "Time Range",
  "Purpose",
  "Requested Equipment Types",
  "Endorsement Document",
  "Post Equipment Inspection - Assigned Units",
  "Post Equipment Inspection - Unit Conditions",
  "Post Equipment Inspection - Linked Built-in Components",
  "Post Equipment Inspection - Remarks",
  "Post Venue Inspection - Overtime Turnover",
  "Post Venue Inspection - Outcome Status",
  "Post Venue Inspection - Violation Category",
  "Post Venue Inspection - Remarks / Notes",
  "Evidence Photos",
  "Rejection / Conflict Reason",
  "Date Created",
  "Last Updated",
];

const EQUIP_HEADERS = [
  "#",
  "Track Number",
  "Requestor",
  "Department / Office",
  "Email Address",
  "Contact Number",
  "Equipment Item",
  "Serial No.",
  "Quantity",
  "Date of Usage",
  "Time Range",
  "Purpose",
  "Date Returned",
  "Time Returned",
  "Outcome",
  "Rejection / Breach Details",
  "Inspection Notes",
  "Attached Photo",
  "Date Created",
  "Last Updated",
];

/**
 * Exports Venue Bookings History to Excel (.xlsx)
 */
export async function exportVenueHistoryToExcel(records, termLabel = "") {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Father Saturnino Urios University - AVR Management";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Venue Bookings History", {
    views: [{ showGridLines: true }],
  });

  applyUniversityHeaderBanner(worksheet, {
    title: "Venue Bookings History Log & Inspection Audit",
    termLabel,
    recordCount: records.length,
    maxCol: VENUE_HEADERS.length,
  });

  const rows = buildVenueRows(records);
  styleTableRows(worksheet, 5, VENUE_HEADERS, rows);

  const filename = `${termPrefix(termLabel)}_venue_history_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await downloadWorkbook(workbook, filename);
}

/**
 * Exports Equipment Borrowings History to Excel (.xlsx)
 */
export async function exportEquipmentHistoryToExcel(records, termLabel = "") {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Father Saturnino Urios University - AVR Management";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Equipment Borrowing History", {
    views: [{ showGridLines: true }],
  });

  applyUniversityHeaderBanner(worksheet, {
    title: "Equipment Borrowings History Log & Unit Inspection Trail",
    termLabel,
    recordCount: records.length,
    maxCol: EQUIP_HEADERS.length,
  });

  const rows = buildEquipmentRows(records);
  styleTableRows(worksheet, 5, EQUIP_HEADERS, rows);

  const filename = `${termPrefix(termLabel)}_equipborrow_history_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await downloadWorkbook(workbook, filename);
}

/**
 * Exports Combined History (both Venue and Equipment) in a multi-tab workbook (.xlsx)
 */
export async function exportAllHistoryToExcel(venueRecords, equipRecords, termLabel = "") {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Father Saturnino Urios University - AVR Management";
  workbook.created = new Date();

  // Tab 1: Venue Bookings
  const wsVenue = workbook.addWorksheet("Venue Bookings", {
    views: [{ showGridLines: true }],
  });
  applyUniversityHeaderBanner(wsVenue, {
    title: "Venue Bookings History Log & Post-Inspection Trail",
    termLabel,
    recordCount: venueRecords.length,
    maxCol: VENUE_HEADERS.length,
  });
  const venueRows = buildVenueRows(venueRecords);
  styleTableRows(wsVenue, 5, VENUE_HEADERS, venueRows);

  // Tab 2: Equipment Borrowings
  const wsEquip = workbook.addWorksheet("Equipment Borrowings", {
    views: [{ showGridLines: true }],
  });
  applyUniversityHeaderBanner(wsEquip, {
    title: "Equipment Borrowings History Log & Unit Serial Trail",
    termLabel,
    recordCount: equipRecords.length,
    maxCol: EQUIP_HEADERS.length,
  });
  const equipRows = buildEquipmentRows(equipRecords);
  styleTableRows(wsEquip, 5, EQUIP_HEADERS, equipRows);

  const totalCount = venueRecords.length + equipRecords.length;
  const filename = `${termPrefix(termLabel)}_combined_history_log_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await downloadWorkbook(workbook, filename);
}
