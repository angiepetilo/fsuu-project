import React, { useState, useEffect } from "react";

export default function BreachesTab({
  ruleViolations = [],
  venueBookings = [],
  equipmentBorrowings = [],
  officeScope = "All Offices",
}) {
  const [localBreaches, setLocalBreaches] = useState([]);
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
      // 1. Direct lookup in assignedUnits
      if (au && typeof au === "object" && au[k]) {
        resolvedBarcode = String(au[k]).trim().toUpperCase();
      }
      // 2. If k is already a barcode that exists in barcodeList
      if (!resolvedBarcode && barcodeList.includes(String(k).trim().toUpperCase())) {
        resolvedBarcode = String(k).trim().toUpperCase();
      }
      // 3. If k is a composite key like "Projector-0" or "0-0", extract the unit index
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
      // 4. Fallback to clean key
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

  // 1. Filter completed venue bookings with policy violations or damaged equipment
  const completedVenueBreaches = venueBookings
    .filter((b) => {
      const s = (b.status || "").toLowerCase();
      return (s === "completed" || s === "damaged" || s === "solved" || s === "done") && 
        (Boolean(b.has_damage) || s === "damaged" || s === "violation" || Boolean(b.violation) || Boolean(b.violation_type) || (b.unit_conditions && typeof b.unit_conditions === "object"));
    })
    .map((b) => {
      const isPolicyViolation = Boolean(b.has_damage) || (b.status || "").toLowerCase() === "damaged" || (b.status || "").toLowerCase() === "violation" || Boolean(b.violation) || Boolean(b.violation_type);
      return {
        department: b.program_office || b.department || "Academic Dept",
        is_venue: isPolicyViolation,
        is_late: false,
        unit_conditions: b.unit_conditions || b.inspection_unit_conditions || null,
        assigned_units: b.assigned_units || null,
        status: (b.status || "").toLowerCase(),
        violation_type: b.violation || b.violation_type || "Venue Violation",
      };
    });

  // 2. Filter equipment borrowings with late returns or equipment damage/lost
  const completedEquipBreaches = equipmentBorrowings
    .filter((eb) => Boolean(eb.is_late) || String(eb.timeliness || "").toLowerCase().includes("late") || String(eb.status || "").toLowerCase().includes("late") || Boolean(eb.has_damage) || (eb.status || "").toLowerCase() === "damaged" || (eb.status || "").toLowerCase() === "lost" || Boolean(eb.violation) || Boolean(eb.violation_type) || (eb.unit_conditions && typeof eb.unit_conditions === "object"))
    .map((eb) => {
      const isLate = Boolean(eb.is_late) || String(eb.timeliness || "").toLowerCase().includes("late") || String(eb.violation_type || "").toLowerCase().includes("overdue") || String(eb.status || "").toLowerCase().includes("late");
      return {
        department: eb.program_office || eb.department || "Academic Dept",
        is_venue: false,
        is_late: isLate,
        unit_conditions: eb.unit_conditions || eb.inspection_unit_conditions || null,
        assigned_units: eb.assigned_units || null,
        status: (eb.status || "").toLowerCase(),
        violation_type: eb.violation || eb.violation_type || (eb.status === "lost" ? "Lost Equipment" : (isLate ? "Late Equipment Return" : "Equipment Damage")),
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
      // Fallback if no unit_conditions object was provided
      if (vType.includes("lost") || b.status === "lost") {
        deptSummaryMap[dName].equipment_lost += 1;
      } else if ((vType.includes("damage") || b.status === "damaged") && !b.is_venue) {
        deptSummaryMap[dName].equipment_damages += 1;
      }
    }

  });

  const departmentSummaries = Object.values(deptSummaryMap);
  const displaySummaries = departmentSummaries.length > 0 ? departmentSummaries : ruleViolations;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div>
          <h3 className="font-black text-slate-900 text-sm">
            Department Violation
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Aggregated violation counts per department from verified inspection logs
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Department", "Policy Violation", "Equipment Violation"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {displaySummaries.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-400">
                  No department breaches or late return violations recorded.
                </td>
              </tr>
            ) : (
              displaySummaries.map((v, idx) => (
                <tr key={v.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5 font-extrabold text-slate-900">{v.department || v.program || "Academic Dept"}</td>
                  <td className="px-4 py-3.5 font-extrabold text-rose-600">
                    {v.venue_violations ?? 0} Violations
                  </td>
                  <td className="px-4 py-3.5 font-extrabold text-slate-800 font-mono">
                    {`${v.late_returns || 0} Late Return / ${v.equipment_damages || 0} Damaged / ${v.equipment_lost || 0} Lost`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Violations Report Typing Box */}
      <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 space-y-2">
        <label className="block text-xs font-extrabold text-slate-800">
          Rule &amp; Late Return Violations Report Notes
        </label>
        <textarea
          rows={3}
          value={violationNotes}
          onChange={(e) => {
            setViolationNotes(e.target.value);
            localStorage.setItem("fsuu_report_breaches_notes", e.target.value);
          }}
          placeholder="Type your rule breaches, late return violations report summary, disciplinary notes, or department compliance recommendations here..."
          className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs transition-all resize-y"
        />
      </div>
    </div>
  );
}
