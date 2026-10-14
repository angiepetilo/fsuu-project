import {
  formatDate,
  formatTimeRange,
  formatDateTime,
  formatDateRange,
} from "@/lib/dateUtils";
import { formatOverdueDuration, getOverdueMinutes } from "@/lib/dateTimeUtils";
import { formatPhilippineNumber } from "@/lib/phoneValidation";

/**
 * Escapes a single value for RFC 4180 compliant CSV output.
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Initiates browser download of a CSV file with UTF-8 BOM.
 */
export function downloadCsv(filename, rows) {
  const csvContent = "\uFEFF" + rows.map((r) => r.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds the file name prefix from the academic term, e.g.
 * "1st Semester AY 2026-2027" -> "1st Semester".
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

/**
 * Determines standard outcome for a Venue record matching HistoryTable logic.
 */
export function getVenueOutcome(b) {
  const st = (b.status || b.tracking_number?.status || "").toLowerCase();
  const noteStr = String(b.notes || b.inspection_notes || "").toLowerCase();
  const isRejected = st === "rejected";
  const isCancelled = st.includes("cancel");
  const hasDamage =
    b.has_damage === true ||
    b.has_damage === 1 ||
    b.has_damage === "1" ||
    String(b.has_damage).toLowerCase() === "true";
  const hasViolation =
    b.violation === true ||
    b.violation === 1 ||
    b.violation === "1" ||
    String(b.violation).toLowerCase() === "true" ||
    (typeof b.violation === "string" && b.violation.length > 0 && b.violation !== "null");
  const isSolved = st === "solved";
  const isLate =
    Boolean(b.is_late) ||
    b.is_late === 1 ||
    b.is_late === "1" ||
    b.is_late === true ||
    st.includes("late") ||
    (b.timeliness || "").toLowerCase().includes("late") ||
    noteStr.includes("late return") ||
    (b.violation_type || "").toLowerCase().includes("late");

  const isStrictlyLateOnly =
    isLate &&
    !hasDamage &&
    !noteStr.includes("policy violation") &&
    !noteStr.includes("damaged") &&
    !noteStr.includes("lost") &&
    b.inspection_condition !== "damaged";

  const isExplicitGood = noteStr.includes("satisfactory") || noteStr.includes("good condition");
  const isBreach =
    !isExplicitGood &&
    (st === "damaged" ||
      hasDamage ||
      (hasViolation && !isStrictlyLateOnly) ||
      b.inspection_condition === "damaged" ||
      b.inspection_status === "violation" ||
      noteStr.includes("policy violation") ||
      noteStr.includes("damaged") ||
      noteStr.includes("lost"));

  if (isRejected && b.is_auto_rejected) {
    return b.auto_reject_winning_reference
      ? `Rejected (automatic) — ${b.auto_reject_winning_reference}`
      : "Rejected (automatic)";
  }
  if (isRejected) return "Rejected";
  if (isCancelled) return "Cancelled";
  if (isSolved) return "Solved";
  if (isBreach) return "Policy Violation";
  if (isLate) return "Late Return";
  return "Good";
}

/**
 * Determines standard outcome for an Equipment record matching HistoryTable logic.
 */
export function getEquipmentOutcome(b) {
  const st = (b.status || b.tracking_number?.status || "").toLowerCase();
  const isRejected = st === "rejected";
  const isCancelled = st.includes("cancel");
  const isSolved = st === "solved";

  let hasLostInUnits = false;
  let hasDamagedInUnits = false;
  if (b.unit_conditions) {
    let uConds = b.unit_conditions;
    if (typeof uConds === "string") {
      try {
        uConds = JSON.parse(uConds);
      } catch {}
    }
    if (typeof uConds === "object" && uConds !== null) {
      Object.values(uConds).forEach((val) => {
        const c = String(
          typeof val === "object" && val !== null ? val.condition || val.status || "" : val
        ).toLowerCase();
        if (c === "lost") hasLostInUnits = true;
        if (c === "damaged") hasDamagedInUnits = true;
      });
    }
  }

  const isDamaged = st === "damaged" || Boolean(b.has_damage) || hasDamagedInUnits;
  const isLost = st === "lost" || Boolean(b.is_lost) || hasLostInUnits;
  const isLate =
    Boolean(b.is_late) ||
    b.is_late === 1 ||
    b.is_late === "1" ||
    b.is_late === true ||
    st.includes("late") ||
    (b.timeliness || "").toLowerCase().includes("late") ||
    String(b.violation_type || "").toLowerCase().includes("late") ||
    String(b.violation || "").toLowerCase().includes("late");
  const isOtherBreach = Boolean(b.violation) && !isLate && !isDamaged && !isLost;

  if (isRejected) return "Rejected";
  if (isCancelled) return "Cancelled";
  if (isSolved) return "Solved";
  if (isLost) return "Lost";
  if (isDamaged) return "Damaged";
  if (isLate) return "Late Returned";
  if (isOtherBreach) return "Policy Violation";
  return "Good";
}

/**
 * Resolves the real unit list of an equipment borrow: one entry per physical unit
 * with its own serial number. Falls back to assigned_units, then to a single
 * blank-serial entry per requested quantity.
 */
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

  // No units assigned (e.g. rejected / cancelled): one row per requested item/quantity
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

/**
 * Resolves requested equipment types summary, e.g. "Standard LCD Projector (1 unit)"
 */
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

/**
 * Resolves assigned physical equipment unit barcodes, e.g. "Unit #1 [SN-20261013-HTFH]"
 */
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

/**
 * Resolves returned equipment physical unit conditions, e.g. "Unit #1 [SN-20261013-HTFH]: Damaged"
 */
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

/**
 * Resolves linked built-in components, e.g. "HDMI [HDMI]"
 */
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

/**
 * Resolves equipment inspection remarks
 */
function getEquipmentRemarks(b) {
  return (
    b.equipment_notes ||
    b.equipment_inspection_remarks ||
    "All physical units inspected in satisfactory condition."
  );
}

/**
 * Resolves overtime turnover text, e.g. "Facility event ended 12h 38m overdue past scheduled time."
 */
function getOvertimeTurnover(b) {
  const mins =
    Number(b.minutes_late || 0) > 0
      ? Number(b.minutes_late)
      : getOverdueMinutes(b.reservation_end_date || b.date_of_usage || b.date, b.time_end);
  if (mins > 0) {
    const formatted = formatOverdueDuration(mins);
    return `Facility event ended ${formatted} past scheduled time.`;
  }
  return "On Time";
}

/**
 * Resolves venue post inspection outcome status: "Policy Violation" or "Satisfactory"
 */
function getVenueInspectionOutcomeStatus(b) {
  const outcome = getVenueOutcome(b);
  if (
    outcome === "Policy Violation" ||
    b.inspection_condition === "damaged" ||
    Boolean(b.has_damage) ||
    Boolean(b.violation)
  ) {
    return "Policy Violation";
  }
  if (outcome === "Rejected" || outcome.startsWith("Rejected")) return "Rejected";
  if (outcome === "Cancelled") return "Cancelled";
  return "Satisfactory";
}

/**
 * Resolves violation category, e.g. "Waste Disposal, Property Damaged"
 */
function getViolationCategory(b) {
  const raw = b.violation_type || b.violation || b.violation_category || "";
  if (!raw) return "";
  return String(raw)
    .replace(/Physical Facility \/ Furniture Damage/gi, "Property Damaged")
    .replace(/Physical Facility or Property Damage/gi, "Property Damaged")
    .replace(/Facility or Property Damage/gi, "Property Damaged")
    .replace(/\s*\/\s*/g, ", ")
    .trim();
}

/**
 * Resolves endorsement document status
 */
function getEndorsementStatus(b) {
  const storageKey = b.id ? `fsuu_hardcopy_${b.id}` : null;
  let isHardcopy = b.physical_hardcopy_received === 1 || b.physical_hardcopy_received === true;
  if (!isHardcopy && storageKey) {
    try {
      isHardcopy = localStorage.getItem(storageKey) === "true";
    } catch {}
  }
  if (isHardcopy) {
    let note = "";
    if (b.id) {
      try {
        note = localStorage.getItem(`fsuu_hardcopy_notes_${b.id}`) || "";
      } catch {}
    }
    return note ? `Physical Hardcopy Received (${note})` : "Physical Hardcopy Received";
  }
  const doc = b.endorsement_letter || b.endorsement_url || b.file_path;
  if (doc) return doc;
  return "Pending File / No Endorsement Document";
}

/**
 * Export Venue Bookings history records to CSV.
 */
export function exportVenueHistoryToCsv(records, termLabel = "") {
  const headers = [
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

  const rows = [headers];

  records.forEach((b, idx) => {
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

    const timeRange = formatTimeRange(b.time_start, b.time_end);
    const purpose = b.purpose || "";

    const requestedEquipmentTypes = getRequestedEquipmentSummary(b);
    const endorsementDocument = getEndorsementStatus(b);

    const assignedUnits = getAssignedUnitsSummary(b);
    const unitConditions = getUnitConditionsSummary(b);
    const builtInComponents = getBuiltInComponentsSummary(b);
    const equipmentRemarks = getEquipmentRemarks(b);

    const overtimeTurnover = getOvertimeTurnover(b);
    const inspectionOutcomeStatus = getVenueInspectionOutcomeStatus(b);
    const violationCategory = getViolationCategory(b);
    const isViolation = inspectionOutcomeStatus === "Policy Violation";
    const venueInspectionNotes =
      b.inspection_notes ||
      b.notes ||
      (isViolation ? "" : "Satisfactory condition recorded. No policy violation notes.");

    const evidencePhotos = toPhotoList(b).join(" | ");

    const conflictOrReason = b.auto_reject_winning_reference
      ? `Competing reservation approved: ${b.auto_reject_winning_reference}`
      : b.rejection_reason || b.remarks || "";

    rows.push([
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
      requestedEquipmentTypes,
      endorsementDocument,
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
    ]);
  });

  downloadCsv(`${termPrefix(termLabel)}_venue_history.csv`, rows);
}

/**
 * Export Equipment Borrowings history records to CSV.
 * One row per physical unit so every quantity shows its own serial number.
 */
export function exportEquipmentHistoryToCsv(records, termLabel = "") {
  const headers = [
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

  const rows = [headers];
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

  downloadCsv(`${termPrefix(termLabel)}_equipborrow_history.csv`, rows);
}
