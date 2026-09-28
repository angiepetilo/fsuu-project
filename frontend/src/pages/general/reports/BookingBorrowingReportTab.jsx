import { useState, useEffect, useMemo } from "react";
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Info,
  ImageIcon,
  X,
  Clock,
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { formatDate, formatTimeRange12 } from "@/lib/dateUtils";

export default function BookingBorrowingReportTab({
  venueBookings = [],
  equipmentBorrowings = [],
  setShowPdfModal,
  loading = false,
}) {
  const [evidenceModalImage, setEvidenceModalImage] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [venueReportNotes, setVenueReportNotes] = useState(() => localStorage.getItem("fsuu_report_venue_notes") || "");
  const [equipReportNotes, setEquipReportNotes] = useState(() => localStorage.getItem("fsuu_report_equipment_notes") || "");
  const [incidentReportNotes, setIncidentReportNotes] = useState(() => localStorage.getItem("fsuu_report_breaches_notes") || "");

  const [venuePage, setVenuePage] = useState(1);
  const [equipPage, setEquipPage] = useState(1);
  const [incidentPage, setIncidentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter completed or active records for report tables
  const reportVenueBookings = venueBookings.filter((b) => {
    return Boolean(b.id || b.reference_code || b.filer_name);
  });

  const reportEquipmentBorrowings = equipmentBorrowings.filter((eb) => {
    return Boolean(eb.id || eb.reference_code || eb.filer_name);
  });

  // Helpers for incident processing
  const cleanDeptName = (raw) => {
    if (!raw) return "Academic Dept";
    const str = String(raw).trim();
    if (str.includes("(")) {
      const mainPart = str.split("(")[0].trim();
      if (mainPart) return mainPart;
    }
    return str;
  };

  const countUniqueDamagedAndLost = (unitConditions, assignedUnits) => {
    if (!unitConditions || typeof unitConditions !== "object") return { damaged: 0, lost: 0 };
    let uCond = unitConditions;
    if (typeof uCond === "string") {
      try { uCond = JSON.parse(uCond); } catch { uCond = {}; }
    }
    let au = assignedUnits || {};
    if (typeof au === "string") {
      try { au = JSON.parse(au); } catch { au = {}; }
    }

    const barcodeList = [];
    if (Array.isArray(au)) {
      au.forEach(b => { if (b) barcodeList.push(String(b).trim().toUpperCase()); });
    } else if (au && typeof au === "object") {
      Object.values(au).forEach(b => { if (b) barcodeList.push(String(b).trim().toUpperCase()); });
    }

    const unitMap = new Map();
    Object.entries(uCond || {}).forEach(([k, val]) => {
      const c = String(val || "").toLowerCase();
      if (!c || c === "complete" || c === "good") return;

      let resolvedBarcode = null;
      if (au && typeof au === "object" && au[k]) {
        resolvedBarcode = String(au[k]).trim().toUpperCase();
      }
      if (!resolvedBarcode && barcodeList.includes(String(k).trim().toUpperCase())) {
        resolvedBarcode = String(k).trim().toUpperCase();
      }
      if (!resolvedBarcode) {
        const match = String(k).match(/-(\d+)$/);
        if (match) {
          const uIdx = parseInt(match[1], 10);
          if (barcodeList[uIdx]) {
            resolvedBarcode = barcodeList[uIdx];
          } else {
            resolvedBarcode = `SLOT-${uIdx}`;
          }
        }
      }
      if (!resolvedBarcode) {
        resolvedBarcode = String(k).trim().toUpperCase();
      }

      unitMap.set(resolvedBarcode, c);
    });

    let damaged = 0;
    let lost = 0;
    unitMap.forEach((status) => {
      if (status === "damaged") damaged++;
      else if (status === "lost") lost++;
    });

    return { damaged, lost };
  };

  // Build incident records
  const incidentRecords = useMemo(() => {
    const records = [];

    venueBookings
      .filter((b) => {
        const s = (b.status || "").toLowerCase();
        const hasUnits = b.unit_conditions && typeof b.unit_conditions === "object";
        const hasDamagedOrLost = Object.values(b.unit_conditions || {}).some(c => {
          const str = String(typeof c === 'object' ? c.condition || c.status : c).toLowerCase();
          return str === 'damaged' || str === 'lost';
        });
        const hasViolation = Boolean(b.violation_type) || Boolean(b.violation) || s === "violation";
        const isDamagedCond = String(b.inspection_condition || b.condition || "").toLowerCase() === 'damaged' || s === 'damaged';
        const isLostCond = String(b.inspection_condition || b.condition || "").toLowerCase() === 'lost' || s === 'lost';
        return hasDamagedOrLost || hasViolation || isDamagedCond || isLostCond || Boolean(b.has_damage) || hasUnits;
      })
      .forEach((b) => {
        const s = (b.status || "").toLowerCase();
        const { damaged, lost } = countUniqueDamagedAndLost(b.unit_conditions || b.inspection_unit_conditions, b.assigned_units);
        const isPolicyViolation = Boolean(b.has_damage) || s === "damaged" || s === "violation" || Boolean(b.violation) || Boolean(b.violation_type);

        if (isPolicyViolation) {
          records.push({
            id: `vb-viol-${b.id}`,
            ref: b.reference_code || `TRK-AVR${b.id}`,
            filer: b.filer_name || "Requestor",
            department: cleanDeptName(b.program_office || b.department),
            target: b.venue_name || b.venue?.name || "AVR Venue",
            type: "Venue Policy Violation",
            badgeStyle: "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
            icon: ShieldAlert,
            iconColor: "text-violet-600 dark:text-violet-400",
            details: b.violation || b.violation_type || "Facility policy breach",
            notes: b.inspection_notes || b.notes || "",
            date: b.date_of_usage || b.created_at || "",
          });
        }

        if (damaged > 0 || b.status === "damaged") {
          records.push({
            id: `vb-dmg-${b.id}`,
            ref: b.reference_code || `TRK-AVR${b.id}`,
            filer: b.filer_name || "Requestor",
            department: cleanDeptName(b.program_office || b.department),
            target: b.venue_name || b.venue?.name || "AVR Venue",
            type: "Venue Unit Damaged",
            badgeStyle: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
            icon: AlertCircle,
            iconColor: "text-rose-600 dark:text-rose-400",
            details: `${damaged || 1} physical unit(s) damaged during venue booking`,
            notes: b.inspection_notes || b.notes || "",
            date: b.date_of_usage || b.created_at || "",
          });
        }

        if (lost > 0 || b.status === "lost") {
          records.push({
            id: `vb-lost-${b.id}`,
            ref: b.reference_code || `TRK-AVR${b.id}`,
            filer: b.filer_name || "Requestor",
            department: cleanDeptName(b.program_office || b.department),
            target: b.venue_name || b.venue?.name || "AVR Venue",
            type: "Venue Unit Lost",
            badgeStyle: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
            icon: AlertTriangle,
            iconColor: "text-amber-600 dark:text-amber-400",
            details: `${lost || 1} physical unit(s) lost during venue booking`,
            notes: b.inspection_notes || b.notes || "",
            date: b.date_of_usage || b.created_at || "",
          });
        }
      });

    equipmentBorrowings
      .filter((eb) => {
        const s = (eb.status || "").toLowerCase();
        const isLate = Boolean(eb.is_late) || String(eb.timeliness || "").toLowerCase().includes("late") || String(eb.status || "").toLowerCase().includes("late");
        const hasDamagedOrLost = Object.values(eb.unit_conditions || {}).some(c => {
          const str = String(typeof c === 'object' ? c.condition || c.status : c).toLowerCase();
          return str === 'damaged' || str === 'lost';
        });
        const isDamagedCond = String(eb.inspection_condition || eb.condition || "").toLowerCase() === 'damaged' || s === 'damaged';
        const isLostCond = String(eb.inspection_condition || eb.condition || "").toLowerCase() === 'lost' || s === 'lost';
        return isLate || hasDamagedOrLost || isDamagedCond || isLostCond || Boolean(eb.has_damage) || Boolean(eb.violation) || Boolean(eb.violation_type);
      })
      .forEach((eb) => {
        const s = (eb.status || "").toLowerCase();
        const isLate = Boolean(eb.is_late) || String(eb.timeliness || "").toLowerCase().includes("late") || String(eb.violation_type || "").toLowerCase().includes("overdue") || s.includes("late");
        const { damaged, lost } = countUniqueDamagedAndLost(eb.unit_conditions || eb.inspection_unit_conditions, eb.assigned_units);

        if (damaged > 0 || eb.status === "damaged") {
          records.push({
            id: `eb-dmg-${eb.id}`,
            ref: eb.reference_code || `EQ-${eb.id}`,
            filer: eb.filer_name || "Borrower",
            department: cleanDeptName(eb.program_office || eb.department),
            target: eb.items?.[0]?.equipmentType?.name || eb.equipment_name || "Equipment Item",
            type: "Equipment Damaged",
            badgeStyle: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
            icon: AlertCircle,
            iconColor: "text-rose-600 dark:text-rose-400",
            details: `${damaged || 1} equipment unit(s) returned damaged`,
            notes: eb.inspection_notes || eb.notes || "",
            date: eb.date_of_usage || eb.created_at || "",
          });
        }

        if (lost > 0 || eb.status === "lost") {
          records.push({
            id: `eb-lost-${eb.id}`,
            ref: eb.reference_code || `EQ-${eb.id}`,
            filer: eb.filer_name || "Borrower",
            department: cleanDeptName(eb.program_office || eb.department),
            target: eb.items?.[0]?.equipmentType?.name || eb.equipment_name || "Equipment Item",
            type: "Equipment Lost",
            badgeStyle: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
            icon: AlertTriangle,
            iconColor: "text-amber-600 dark:text-amber-400",
            details: `${lost || 1} equipment unit(s) reported lost`,
            notes: eb.inspection_notes || eb.notes || "",
            date: eb.date_of_usage || eb.created_at || "",
          });
        }

        if (isLate && damaged === 0 && lost === 0) {
          records.push({
            id: `eb-late-${eb.id}`,
            ref: eb.reference_code || `EQ-${eb.id}`,
            filer: eb.filer_name || "Borrower",
            department: cleanDeptName(eb.program_office || eb.department),
            target: eb.items?.[0]?.equipmentType?.name || eb.equipment_name || "Equipment Item",
            type: "Late Return Violation",
            badgeStyle: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
            icon: ShieldAlert,
            iconColor: "text-amber-600 dark:text-amber-400",
            details: eb.minutes_late ? `Overdue by ${eb.minutes_late} minutes` : "Returned past scheduled time",
            notes: eb.inspection_notes || eb.notes || "",
            date: eb.date_of_usage || eb.created_at || "",
          });
        }
      });

    return records;
  }, [venueBookings, equipmentBorrowings]);

  useEffect(() => {
    setVenuePage(1);
  }, [reportVenueBookings.length]);

  useEffect(() => {
    setEquipPage(1);
  }, [reportEquipmentBorrowings.length]);

  useEffect(() => {
    setIncidentPage(1);
  }, [incidentRecords.length]);

  const venueTotalPages = Math.ceil(reportVenueBookings.length / ITEMS_PER_PAGE) || 1;
  const venueStartIndex = (venuePage - 1) * ITEMS_PER_PAGE;
  const paginatedVenueRecords = reportVenueBookings.slice(venueStartIndex, venueStartIndex + ITEMS_PER_PAGE);

  const equipTotalPages = Math.ceil(reportEquipmentBorrowings.length / ITEMS_PER_PAGE) || 1;
  const equipStartIndex = (equipPage - 1) * ITEMS_PER_PAGE;
  const paginatedEquipRecords = reportEquipmentBorrowings.slice(equipStartIndex, equipStartIndex + ITEMS_PER_PAGE);

  const incidentTotalPages = Math.ceil(incidentRecords.length / ITEMS_PER_PAGE) || 1;
  const incidentStartIndex = (incidentPage - 1) * ITEMS_PER_PAGE;
  const paginatedIncidentRecords = incidentRecords.slice(incidentStartIndex, incidentStartIndex + ITEMS_PER_PAGE);

  const getStatusBadge = (statusStr) => {
    const s = String(statusStr || "PENDING").toUpperCase();
    if (s === "PENDING") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
          PENDING
        </span>
      );
    }
    if (s === "APPROVED" || s === "SCHEDULED") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {s}
        </span>
      );
    }
    if (s === "ON-GOING" || s === "ONGOING" || s === "BORROWED" || s === "IN_USE") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          ON-GOING
        </span>
      );
    }
    if (s === "COMPLETED" || s === "RETURNED" || s === "DONE" || s === "GOOD CONDITION" || s === "GOOD") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          {s}
        </span>
      );
    }
    if (s === "REJECTED" || s === "CANCELLED" || s === "POLICY VIOLATION" || s === "DAMAGED" || s === "LOST" || s === "DAMAGE") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          {s}
        </span>
      );
    }
    if (s === "LATE RETURN" || s === "RETURNED LATE") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
          LATE RETURN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        {s}
      </span>
    );
  };

  const renderStatusAndInspectionNote = (record, defaultStatus) => {
    const s = String(defaultStatus || record.status || "").toUpperCase();
    
    if (s === "REJECTED" || s === "CANCELLED") {
      const reason = record.rejection_reason || record.remarks || record.notes || "";
      return (
        <div className="flex flex-col items-center justify-center gap-1 max-w-[220px] mx-auto text-center py-1">
          <span className={`text-[11px] font-bold ${s === "REJECTED" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>
            {s === "REJECTED" ? "Rejected" : "Cancelled"}
          </span>
          {reason && (
             <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic leading-tight" title={reason}>
               {reason.length > 50 ? reason.substring(0, 50) + "..." : reason}
             </span>
          )}
        </div>
      );
    }

    if (s === "LOST") {
      const note = record.inspection_notes || record.notes || record.violation || record.violation_type || "";
      return (
        <div className="flex flex-col items-center justify-center gap-1 max-w-[220px] mx-auto text-center py-1">
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Lost</span>
          {note && note !== "Returned safely in good condition." && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic leading-tight" title={note}>
              {note.length > 50 ? note.substring(0, 50) + "..." : note}
            </span>
          )}
        </div>
      );
    }

    if (s === "DAMAGED") {
      const note = record.inspection_notes || record.notes || record.violation || record.violation_type || "";
      return (
        <div className="flex flex-col items-center justify-center gap-1 max-w-[220px] mx-auto text-center py-1">
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Damaged</span>
          {note && note !== "Returned safely in good condition." && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic leading-tight" title={note}>
              {note.length > 50 ? note.substring(0, 50) + "..." : note}
            </span>
          )}
        </div>
      );
    }

    let rawNote =
      record.inspection_notes ||
      record.notes ||
      record.violation ||
      record.violation_type ||
      record.inspection?.notes ||
      "";

    if (typeof rawNote === "string") {
      rawNote = rawNote.replace(/Physical Facility \/ Furniture Damage/gi, "Property Damaged");
      rawNote = rawNote.replace(/Facility or Property Damage/gi, "Property Damaged");
      rawNote = rawNote.replace(/Property Damaged,\s*Property Damaged/gi, "Property Damaged");
    }
    const condition = (record.inspection_condition || record.condition || "").toLowerCase();

    return (
      <div className="flex flex-col items-center justify-center gap-1 max-w-[220px] mx-auto text-center py-1">
        {rawNote ? (
          <span
            className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-snug break-words max-w-full text-center"
            title={rawNote}
          >
            {rawNote}
          </span>
        ) : condition ? (
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 capitalize">
            {condition === "good" || condition === "clean" ? "*COMPLETE PHYSICAL UNIT*" : condition}
          </span>
        ) : (
          <span className="text-[10.5px] text-slate-400 dark:text-slate-500 font-normal italic">
            No inspection note
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* ── 1. VENUE BOOKING REPORTS TABLE ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Venue Booking Reports</span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{reportVenueBookings.length} records</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4 w-10">#</th>
                <th className="py-3 px-4">TRACK NO.</th>
                <th className="py-3 px-4">REQUESTOR</th>
                <th className="py-3 px-4">DEPARTMENT</th>
                <th className="py-3 px-4">VENUE</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">TIME</th>
                <th className="py-3 px-4 text-center">NOTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 dark:text-slate-500">
                    <Loader2 size={16} className="animate-spin inline mr-1.5 text-blue-600" />
                    Loading...
                  </td>
                </tr>
              ) : reportVenueBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 dark:text-slate-500">No venue booking records found.</td>
                </tr>
              ) : (
                paginatedVenueRecords.map((b, idx) => {
                  const trackNo =
                    b.tracking_number?.reference_code ||
                    (typeof b.tracking_number === "string" ? b.tracking_number : "") ||
                    b.track_number ||
                    b.reference_code ||
                    `TRK-VB-${1000 + (b.id || idx)}`;
                  let status = b.tracking_number?.status || b.status || "PENDING";
                  if (String(status).toUpperCase() === "DAMAGED") {
                    status = "POLICY VIOLATION";
                  }
                  const timeFormatted = formatTimeRange12(b.time_start || b.time, b.time_end);

                  return (
                    <tr key={`rpt-venue-${b.id || idx}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{venueStartIndex + idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 font-mono">{trackNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{b.filer_name || b.requestor || "Filer"}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{b.program_office || b.dept || b.office || "CAS"}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{b.venue_name || b.venue?.name || b.venue || "Audio Visual Room"}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(b.date_of_usage || b.date)}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{timeFormatted || "08:00 AM – 04:00 PM"}</td>
                      <td className="py-3 px-4 text-center">{renderStatusAndInspectionNote(b, status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {reportVenueBookings.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold pt-1">
            <span>{venueStartIndex + 1}–{Math.min(venueStartIndex + ITEMS_PER_PAGE, reportVenueBookings.length)} of {reportVenueBookings.length}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={venuePage === 1}
                onClick={() => setVenuePage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="px-2 text-slate-700 dark:text-slate-300">{venuePage} / {venueTotalPages}</span>
              <button
                type="button"
                disabled={venuePage >= venueTotalPages}
                onClick={() => setVenuePage(prev => Math.min(prev + 1, venueTotalPages))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Venue Report Notes</label>
          <textarea
            rows={2}
            value={venueReportNotes}
            onChange={(e) => { setVenueReportNotes(e.target.value); localStorage.setItem("fsuu_report_venue_notes", e.target.value); }}
            placeholder="Add venue booking observations or audit summary..."
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* ── 2. EQUIPMENT BORROWING REPORTS TABLE ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Equipment Borrowing Reports</span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{reportEquipmentBorrowings.length} records</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4 w-10">#</th>
                <th className="py-3 px-4">TRACK NO.</th>
                <th className="py-3 px-4">REQUESTOR</th>
                <th className="py-3 px-4">DEPARTMENT</th>
                <th className="py-3 px-4">EQUIPMENT</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">TIME</th>
                <th className="py-3 px-4">LATE RETURN</th>
                <th className="py-3 px-4">MINS LATE</th>
                <th className="py-3 px-4 text-center">NOTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 dark:text-slate-500">
                    <Loader2 size={16} className="animate-spin inline mr-1.5 text-blue-600" />
                    Loading...
                  </td>
                </tr>
              ) : reportEquipmentBorrowings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 dark:text-slate-500">No equipment borrowing records found.</td>
                </tr>
              ) : (
                paginatedEquipRecords.map((eb, idx) => {
                  const trackNo =
                    eb.tracking_number?.reference_code ||
                    (typeof eb.tracking_number === "string" ? eb.tracking_number : "") ||
                    eb.track_number ||
                    eb.reference_code ||
                    `TRK-EQ-${1000 + (eb.id || idx)}`;
                  const status = eb.tracking_number?.status || eb.status || "PENDING";
                  const timeFormatted = formatTimeRange12(eb.time_start || eb.time, eb.time_end);
                  const isLate = Boolean(eb.is_late) || String(eb.timeliness || "").toLowerCase().includes("late");
                  const minutesLate = Number(eb.minutes_late || 0);

                  return (
                    <tr key={`rpt-equip-${eb.id || idx}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{equipStartIndex + idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 font-mono">{trackNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{eb.filer_name || eb.requestor || "Borrower"}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{eb.program_office || eb.dept || eb.office || "CAS"}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{eb.items?.[0]?.equipmentType?.name || eb.equipment_name || "Equipment"}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(eb.date_of_usage || eb.date)}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{timeFormatted || "08:00 AM – 04:00 PM"}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isLate
                            ? "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        }`}>
                          {isLate ? "Late" : "On Time"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono">
                        {isLate ? (minutesLate > 0 ? `${minutesLate}m` : "—") : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">{renderStatusAndInspectionNote(eb, status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {reportEquipmentBorrowings.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold pt-1">
            <span>{equipStartIndex + 1}–{Math.min(equipStartIndex + ITEMS_PER_PAGE, reportEquipmentBorrowings.length)} of {reportEquipmentBorrowings.length}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={equipPage === 1}
                onClick={() => setEquipPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="px-2 text-slate-700 dark:text-slate-300">{equipPage} / {equipTotalPages}</span>
              <button
                type="button"
                disabled={equipPage >= equipTotalPages}
                onClick={() => setEquipPage(prev => Math.min(prev + 1, equipTotalPages))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Report Notes</label>
          <textarea
            rows={2}
            value={equipReportNotes}
            onChange={(e) => { setEquipReportNotes(e.target.value); localStorage.setItem("fsuu_report_equipment_notes", e.target.value); }}
            placeholder="Add equipment borrowing observations or audit notes..."
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* ── 3. RECORDED INCIDENTS, DAMAGES & POLICY BREACHES (Item 21) ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Incident and Damages View</span>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{incidentRecords.length} records</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            {incidentRecords.length} Detected
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4 w-10">#</th>
                <th className="py-3 px-4">REFERENCE</th>
                <th className="py-3 px-4">INCIDENT TYPE</th>
                <th className="py-3 px-4">REQUESTOR &amp; DEPT</th>
                <th className="py-3 px-4">FACILITY / ITEM</th>
                <th className="py-3 px-4">BREACH &amp; DAMAGE DETAILS</th>
                <th className="py-3 px-4">DATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
              {incidentRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 dark:text-slate-500">
                    No active incident, damage, or violation records detected.
                  </td>
                </tr>
              ) : (
                paginatedIncidentRecords.map((inc, idx) => {
                  const IconComp = inc.icon;
                  return (
                    <tr key={inc.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{incidentStartIndex + idx + 1}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                          {inc.ref}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${inc.badgeStyle}`}>
                          <IconComp size={12} className={inc.iconColor} />
                          {inc.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">{inc.filer}</span>
                          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold">{inc.department}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{inc.target}</span>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{inc.details}</span>
                          {inc.notes && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5 line-clamp-2">
                              "{inc.notes}"
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {inc.date ? formatDate(inc.date) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {incidentRecords.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold pt-1">
            <span>{incidentStartIndex + 1}–{Math.min(incidentStartIndex + ITEMS_PER_PAGE, incidentRecords.length)} of {incidentRecords.length}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={incidentPage === 1}
                onClick={() => setIncidentPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="px-2 text-slate-700 dark:text-slate-300">{incidentPage} / {incidentTotalPages}</span>
              <button
                type="button"
                disabled={incidentPage >= incidentTotalPages}
                onClick={() => setIncidentPage(prev => Math.min(prev + 1, incidentTotalPages))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Incident Report Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Rule &amp; Incident Violations Report Notes
          </label>
          <textarea
            rows={2}
            value={incidentReportNotes}
            onChange={(e) => {
              setIncidentReportNotes(e.target.value);
              localStorage.setItem("fsuu_report_breaches_notes", e.target.value);
            }}
            placeholder="Type your rule breaches, damage log, late return summary, or department compliance recommendations here..."
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Record Quick View Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm">
                  {selectedRecord.type === "venue" ? "Venue Booking Details" : "Equipment Borrowing Details"}
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-mono font-bold mt-0.5">
                  {selectedRecord.data.tracking_number?.reference_code || selectedRecord.data.reference_code || "Record"}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Requestor:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedRecord.data.filer_name || selectedRecord.data.requestor || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Department / Program:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedRecord.data.program_office || selectedRecord.data.dept || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Contact &amp; Email:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedRecord.data.email_address || selectedRecord.data.email || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Schedule:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatDate(selectedRecord.data.date_of_usage || selectedRecord.data.date)} ({formatTimeRange12(selectedRecord.data.time_start, selectedRecord.data.time_end)})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Purpose:</span>
                <span className="font-bold text-slate-900 dark:text-white max-w-[240px] text-right">{selectedRecord.data.purpose || selectedRecord.data.event || "—"}</span>
              </div>
              {selectedRecord.type === "equipment" && (
                <>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Late Return Status:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedRecord.data.is_late || Number(selectedRecord.data.minutes_late) > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-extrabold">Late Return</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">On Time</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Mins of Late Return:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {Number(selectedRecord.data.minutes_late || 0) > 0
                        ? `${selectedRecord.data.minutes_late} mins`
                        : "0 mins"}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Status:</span>
                <div>{getStatusBadge(selectedRecord.data.tracking_number?.status || selectedRecord.data.status)}</div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
