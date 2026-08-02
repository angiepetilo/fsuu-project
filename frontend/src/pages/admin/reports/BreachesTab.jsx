import { ShieldAlert, AlertTriangle, Clock, Wrench } from "lucide-react";

export default function BreachesTab({
  ruleViolations = [],
  officeScope = "All Offices",
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-rose-600" />
          <span className="font-bold text-slate-900 text-sm">Rule & Late Return Violation Records</span>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {ruleViolations.length}
          </span>
        </div>
      </div>

      {/* Table Item 25: [#, department/program, office, venue violation, late return, equipment damages + lost] */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Department / Program", "Campus Office", "Venue Violation", "Late Return", "Equipment Damages + Lost"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {ruleViolations.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400 flex items-center justify-center gap-2">
                  <ShieldAlert size={16} className="text-slate-400" />
                  <span>No department breaches or late return violations recorded.</span>
                </td>
              </tr>
            ) : (
              ruleViolations.map((v, idx) => (
                <tr key={v.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5 font-extrabold text-slate-900">{v.department || v.program || "Academic Dept"}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
                      {v.office || "FSUU Main"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-rose-700">
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle size={12} className="text-rose-500" />
                      {v.venue_violations ?? 0} Breaches
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-amber-700">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} className="text-amber-500" />
                      {v.late_returns ?? 0} Late Returns
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-purple-700">
                    <span className="inline-flex items-center gap-1">
                      <Wrench size={12} className="text-purple-500" />
                      {(v.equipment_damages ?? 0) + (v.equipment_lost ?? 0)} Items Damaged/Lost
                    </span>
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
