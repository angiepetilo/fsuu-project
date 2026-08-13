import React, { useState, useEffect } from "react";

export default function BreachesTab({
  ruleViolations = [],
  venueBookings = [],
  equipmentBorrowings = [],
  officeScope = "All Offices",
}) {
  const [localBreaches, setLocalBreaches] = useState([]);

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
          department: dept || "ASP",
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

  // Filter ONLY completed venue bookings with damage/violations
  const completedVenueBreaches = venueBookings
    .filter((b) => {
      const s = (b.status || "").toLowerCase();
      return (s === "completed" || s === "damaged" || s === "solved" || s === "done") && (Boolean(b.has_damage) || s === "damaged" || s === "violation" || Boolean(b.violation));
    })
    .map((b) => ({
      department: b.program_office || b.department || "Academic Dept",
      violation_type: b.violation || b.violation_type || "Venue Violation",
    }));

  const completedEquipBreaches = equipmentBorrowings
    .filter((eb) => Boolean(eb.has_damage) || (eb.status || "").toLowerCase() === "damaged" || (eb.status || "").toLowerCase() === "lost" || Boolean(eb.is_late))
    .map((eb) => ({
      department: eb.program_office || eb.department || "Academic Dept",
      violation_type: eb.violation || (eb.status === "lost" ? "Lost Equipment" : (eb.is_late ? "Late Equipment Return" : "Equipment Damage")),
    }));

  const cleanDeptName = (raw) => {
    if (!raw) return "Academic Dept";
    const str = String(raw).trim();
    if (str.includes("(")) {
      const mainPart = str.split("(")[0].trim();
      if (mainPart) return mainPart;
    }
    return str;
  };

  // Combine synced History Log records + local inspection breaches
  const allSyncedBreaches = [...completedVenueBreaches, ...completedEquipBreaches, ...localBreaches];

  // Department summary counts for overview
  const deptSummaryMap = {};
  allSyncedBreaches.forEach((b) => {
    const dName = cleanDeptName(b.department);
    if (!deptSummaryMap[dName]) {
      deptSummaryMap[dName] = { department: dName, venue_violations: 0, late_returns: 0, equipment_damages: 0, equipment_lost: 0 };
    }
    const vType = String(b.violation_type || "").toLowerCase();
    if (vType.includes("late")) {
      deptSummaryMap[dName].late_returns += 1;
    } else if (vType.includes("lost")) {
      deptSummaryMap[dName].equipment_lost += 1;
    } else if (vType.includes("equipment") || vType.includes("damage")) {
      deptSummaryMap[dName].equipment_damages += 1;
    } else {
      deptSummaryMap[dName].venue_violations += 1;
    }
  });

  const departmentSummaries = Object.values(deptSummaryMap);
  const displaySummaries = departmentSummaries.length > 0 ? departmentSummaries : ruleViolations;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div>
          <h3 className="font-black text-slate-900 text-sm">
            Department Violation Totals Summary
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
              {["#", "Department / Program", "Campus Office", "Venue Breaches", "Equipment Violation"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {displaySummaries.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  No department breaches or late return violations recorded.
                </td>
              </tr>
            ) : (
              displaySummaries.map((v, idx) => (
                <tr key={v.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5 font-extrabold text-slate-900">{v.department || v.program || "Academic Dept"}</td>
                  <td className="px-4 py-3.5 text-slate-700 font-extrabold">
                    {v.office || officeScope || "FSUU Main"}
                  </td>
                  <td className="px-4 py-3.5 font-extrabold text-rose-600">
                    {v.venue_violations ?? 0} Breaches
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
    </div>
  );
}
