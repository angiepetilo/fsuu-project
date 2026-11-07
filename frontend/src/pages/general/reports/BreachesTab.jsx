import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function BreachesTab({
  ruleViolations = [],
  venueBookings = [],
  equipmentBorrowings = [],
  officeScope = "All Offices",
}) {
  const [localBreaches, setLocalBreaches] = useState([]);
  const [incidentPage, setIncidentPage] = useState(1);
  const INCIDENTS_PER_PAGE = 10;
  const [violationNotes, setViolationNotes] = useState(() => localStorage.getItem("fsuu_report_breaches_notes") || "");

  const loadLocalBreaches = () => {
    try {
      const logs = JSON.parse(localStorage.getItem("fsuu_breaches_log") || "[]");
      const damagedLogs = JSON.parse(localStorage.getItem("fsuu_damaged_equipment_log") || "[]");
      
      const mappedDamagedLogs = (Array.isArray(damagedLogs) ? damagedLogs : []).map(d => {
        let dept = d.department || d.program_office || d.dept;
        if (!dept && d.borrow_id && Array.isArray(equipmentBorrowings)) {
          const matchEB = equipmentBorrowings.find(eb => String(eb.id) === String(d.borrow_id));
          if (matchEB) dept = matchEB.program_office || matchEB.department || matchEB.dept;
        }
        if (!dept && d.booking_id && Array.isArray(venueBookings)) {
          const matchVB = venueBookings.find(vb => String(vb.id) === String(d.booking_id));
          if (matchVB) dept = matchVB.program_office || matchVB.department || matchVB.dept;
        }
        return {
          department: dept || "Academic Dept",
          violation_type: d.condition === "Lost" ? "Equipment Lost" : "Equipment Damage",
        };
      });

      const combined = [
        ...(Array.isArray(logs) ? logs : []),
        ...mappedDamagedLogs
      ];
      setLocalBreaches(combined);
    } catch {
      setLocalBreaches([]);
    }
  };

  useEffect(() => {
    loadLocalBreaches();
    const handleUpdate = () => loadLocalBreaches();
    window.addEventListener("equipment_inventory_updated", handleUpdate);
    return () => window.removeEventListener("equipment_inventory_updated", handleUpdate);
  }, []);

  const cleanDeptName = (raw) => {
    if (!raw) return "Academic Dept";
    const str = String(raw).trim();
    if (str.includes("(")) {
      const mainPart = str.split("(")[0].trim();
      if (mainPart) return mainPart;
    }
    return str;
  };

  // Helper: Count unique damaged and lost units without double-counting positional vs barcode duplicate keys
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

    // Build barcode values list from assignedUnits
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

  // 1. Filter venue bookings with policy violations or damaged/lost equipment
  const completedVenueBreaches = venueBookings
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
    .map((b) => {
      const s = (b.status || "").toLowerCase();
      const isPolicyViolation = Boolean(b.has_damage) || s === "damaged" || s === "violation" || Boolean(b.violation) || Boolean(b.violation_type);
      return {
        id: b.id,
        reference_code: b.reference_code || `TRK-AVR${b.id}`,
        filer_name: b.filer_name || "Requestor",
        department: b.program_office || b.department || "Academic Dept",
        venue_name: b.venue_name || b.venue?.name || "AVR Facility",
        date: b.date_of_usage || b.created_at || "",
        is_venue: isPolicyViolation,
        is_late: false,
        unit_conditions: b.unit_conditions || b.inspection_unit_conditions || null,
        assigned_units: b.assigned_units || null,
        status: s,
        violation_type: b.violation || b.violation_type || "Venue Policy Violation",
        inspection_notes: b.inspection_notes || b.notes || "",
      };
    });

  // 2. Filter equipment borrowings with late returns or equipment damage/lost
  const completedEquipBreaches = equipmentBorrowings
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
    .map((eb) => {
      const s = (eb.status || "").toLowerCase();
      const isLate = Boolean(eb.is_late) || String(eb.timeliness || "").toLowerCase().includes("late") || String(eb.violation_type || "").toLowerCase().includes("overdue") || s.includes("late");
      return {
        id: eb.id,
        reference_code: eb.reference_code || `EQ-${eb.id}`,
        filer_name: eb.filer_name || "Borrower",
        department: eb.program_office || eb.department || "Academic Dept",
        equipment_name: eb.items?.[0]?.equipmentType?.name || eb.equipment_name || "Equipment Item",
        date: eb.date_of_usage || eb.created_at || "",
        is_venue: false,
        is_late: isLate,
        unit_conditions: eb.unit_conditions || eb.inspection_unit_conditions || null,
        assigned_units: eb.assigned_units || null,
        status: s,
        violation_type: eb.violation || eb.violation_type || (s === "lost" ? "Lost Equipment" : (isLate ? "Late Equipment Return" : "Equipment Damage")),
        inspection_notes: eb.inspection_notes || eb.notes || "",
        minutes_late: eb.minutes_late || 0,
      };
    });

  // Department summary counts for overview
  const deptSummaryMap = {};
  
  // Seed all departments to ensure those with 0 breaches are displayed
  const seedDept = (deptNameRaw) => {
    const dName = cleanDeptName(deptNameRaw);
    if (!deptSummaryMap[dName]) {
      deptSummaryMap[dName] = {
        department: dName,
        venue_violations: 0,
        late_returns: 0,
        equipment_damages: 0,
        equipment_lost: 0,
      };
    }
  };
  
  venueBookings.forEach(b => seedDept(b.program_office || b.department || "Academic Dept"));
  equipmentBorrowings.forEach(eb => seedDept(eb.program_office || eb.department || "Academic Dept"));

  // Process unique record breaches
  [...completedVenueBreaches, ...completedEquipBreaches].forEach((b) => {
    const dName = cleanDeptName(b.department);
    if (!deptSummaryMap[dName]) {
      deptSummaryMap[dName] = {
        department: dName,
        venue_violations: 0,
        late_returns: 0,
        equipment_damages: 0,
        equipment_lost: 0,
      };
    }

    if (b.is_venue) {
      deptSummaryMap[dName].venue_violations += 1;
    }

    const vType = String(b.violation_type || "").toLowerCase();

    // 1. Late Return check
    if (b.is_late || vType.includes("late") || vType.includes("overdue")) {
      deptSummaryMap[dName].late_returns += 1;
    }

    // 2. Granular Unit Condition check (deduplicated by unique unit barcode / slot)
    const { damaged, lost } = countUniqueDamagedAndLost(b.unit_conditions, b.assigned_units);
    if (damaged > 0 || lost > 0) {
      deptSummaryMap[dName].equipment_damages += damaged;
      deptSummaryMap[dName].equipment_lost += lost;
    } else {
      if (vType.includes("lost") || b.status === "lost") {
        deptSummaryMap[dName].equipment_lost += 1;
      } else if ((vType.includes("damage") || b.status === "damaged") && !b.is_venue) {
        deptSummaryMap[dName].equipment_damages += 1;
      }
    }
  });

  const departmentSummaries = Object.values(deptSummaryMap);
  const displaySummaries = departmentSummaries.length > 0 ? departmentSummaries : ruleViolations;

  // Build granular incident log list for display
  const incidentRecords = useMemo(() => {
    const records = [];

    completedVenueBreaches.forEach((vb) => {
      const { damaged, lost } = countUniqueDamagedAndLost(vb.unit_conditions, vb.assigned_units);
      
      // Policy violation
      if (vb.is_venue) {
        records.push({
          id: `vb-viol-${vb.id}`,
          ref: vb.reference_code,
          filer: vb.filer_name,
          department: cleanDeptName(vb.department),
          target: vb.venue_name || "AVR Venue",
          type: "Violation",
          textColor: "text-purple-600",
          details: vb.violation_type || "Facility policy breach",
          notes: vb.inspection_notes,
          date: vb.date,
        });
      }

      // Unit damaged in venue booking
      if (damaged > 0 || vb.status === "damaged") {
        records.push({
          id: `vb-dmg-${vb.id}`,
          ref: vb.reference_code,
          filer: vb.filer_name,
          department: cleanDeptName(vb.department),
          target: vb.venue_name || "AVR Venue",
          type: "Damaged",
          textColor: "text-rose-600",
          details: `${damaged || 1} physical unit(s) damaged during venue booking`,
          notes: vb.inspection_notes,
          date: vb.date,
        });
      }

      // Unit lost in venue booking
      if (lost > 0 || vb.status === "lost") {
        records.push({
          id: `vb-lost-${vb.id}`,
          ref: vb.reference_code,
          filer: vb.filer_name,
          department: cleanDeptName(vb.department),
          target: vb.venue_name || "AVR Venue",
          type: "Lost",
          textColor: "text-amber-700",
          details: `${lost || 1} physical unit(s) lost during venue booking`,
          notes: vb.inspection_notes,
          date: vb.date,
        });
      }
    });

    completedEquipBreaches.forEach((eb) => {
      const { damaged, lost } = countUniqueDamagedAndLost(eb.unit_conditions, eb.assigned_units);

      // Unit damaged in equipment borrowing
      if (damaged > 0 || eb.status === "damaged") {
        records.push({
          id: `eb-dmg-${eb.id}`,
          ref: eb.reference_code,
          filer: eb.filer_name,
          department: cleanDeptName(eb.department),
          target: eb.equipment_name || "Equipment Item",
          type: "Damaged",
          textColor: "text-rose-600",
          details: `${damaged || 1} equipment unit(s) returned damaged`,
          notes: eb.inspection_notes,
          date: eb.date,
        });
      }

      // Unit lost in equipment borrowing
      if (lost > 0 || eb.status === "lost") {
        records.push({
          id: `eb-lost-${eb.id}`,
          ref: eb.reference_code,
          filer: eb.filer_name,
          department: cleanDeptName(eb.department),
          target: eb.equipment_name || "Equipment Item",
          type: "Lost",
          textColor: "text-amber-700",
          details: `${lost || 1} equipment unit(s) reported lost`,
          notes: eb.inspection_notes,
          date: eb.date,
        });
      }

      // Late return
      if (eb.is_late && damaged === 0 && lost === 0) {
        records.push({
          id: `eb-late-${eb.id}`,
          ref: eb.reference_code,
          filer: eb.filer_name,
          department: cleanDeptName(eb.department),
          target: eb.equipment_name || "Equipment Item",
          type: "Late",
          textColor: "text-amber-700",
          details: eb.minutes_late ? `Overdue by ${eb.minutes_late} minutes` : "Returned past scheduled time",
          notes: eb.inspection_notes,
          date: eb.date,
        });
      }
    });

    return records;
  }, [completedVenueBreaches, completedEquipBreaches]);

  return (
    <div className="space-y-6">
      {/* 1. Department Violation Overview Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Department Violation Summary
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Aggregated rule breaches, facility policy violations, and equipment damages by department.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Policy Violation</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Late Return</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Damaged</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Lost</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
              {displaySummaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 dark:text-slate-500">
                    No department breaches or late return violations recorded.
                  </td>
                </tr>
              ) : (
                displaySummaries.map((v, idx) => {
                  const policyCount = Number(v.venue_violations ?? 0);
                  const lateCount = Number(v.late_returns ?? 0);
                  const damagedCount = Number(v.equipment_damages ?? 0);
                  const lostCount = Number(v.equipment_lost ?? 0);
                  const totalCount = policyCount + lateCount + damagedCount + lostCount;

                  return (
                    <tr key={v.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{v.department || v.program || "Academic Dept"}</td>
                      <td className={`px-4 py-3 text-center font-bold ${policyCount > 0 ? "text-purple-600 dark:text-purple-400" : "text-slate-400 dark:text-slate-500"}`}>
                        {policyCount}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${lateCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"}`}>
                        {lateCount}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${damagedCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"}`}>
                        {damagedCount}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${lostCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"}`}>
                        {lostCount}
                      </td>
                      <td className={`px-4 py-3 text-center font-extrabold ${totalCount > 0 ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                        {totalCount}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Granular Incident & Damage Activity Log */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Incident and Damages View
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Individual venue booking violations, damaged or lost units, and equipment return incidents.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {incidentRecords.length} Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3.5">Reference</th>
                <th className="px-4 py-3.5">Incident Type</th>
                <th className="px-4 py-3.5">Requestor &amp; Department</th>
                <th className="px-4 py-3.5">Facility / Item</th>
                <th className="px-4 py-3.5">Breach &amp; Damage Details</th>
                <th className="px-4 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {incidentRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 dark:text-slate-500">
                    No active incident, damage, or violation records detected for this term.
                  </td>
                </tr>
              ) : (
                incidentRecords
                  .slice((incidentPage - 1) * INCIDENTS_PER_PAGE, incidentPage * INCIDENTS_PER_PAGE)
                  .map((inc) => {
                    return (
                      <tr key={inc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Reference Code */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                            {inc.ref}
                          </span>
                        </td>

                        {/* Incident Type Plain Text */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-semibold ${inc.textColor}`}>
                            {inc.type}
                          </span>
                        </td>

                        {/* Requestor & Department */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">{inc.filer}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{inc.department}</span>
                          </div>
                        </td>

                        {/* Facility / Item */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{inc.target}</span>
                        </td>

                        {/* Breach & Damage Details */}
                        <td className="px-4 py-3 max-w-sm">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{inc.details}</span>
                            {inc.notes && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5 line-clamp-2">
                                "{inc.notes}"
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {inc.date ? new Date(inc.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        {incidentRecords.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">
              Showing {(incidentPage - 1) * INCIDENTS_PER_PAGE + 1} to {Math.min(incidentPage * INCIDENTS_PER_PAGE, incidentRecords.length)} of {incidentRecords.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={incidentPage <= 1}
                onClick={() => setIncidentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-2">
                {incidentPage} / {Math.ceil(incidentRecords.length / INCIDENTS_PER_PAGE) || 1}
              </span>
              <button
                type="button"
                disabled={incidentPage >= Math.ceil(incidentRecords.length / INCIDENTS_PER_PAGE)}
                onClick={() => setIncidentPage((p) => Math.min(Math.ceil(incidentRecords.length / INCIDENTS_PER_PAGE) || 1, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* User Violations Report Typing Box */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Rule &amp; Late Return Violations Export Notes <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Included in PDF / Excel)</span>
          </label>
          <textarea
            rows={2}
            value={violationNotes}
            onChange={(e) => {
              setViolationNotes(e.target.value);
              localStorage.setItem("fsuu_report_breaches_notes", e.target.value);
            }}
            placeholder="Add rule breaches, late return violations summary, or compliance notes for exported reports..."
            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 transition-all resize-y"
          />
        </div>
      </div>
    </div>
  );
}
