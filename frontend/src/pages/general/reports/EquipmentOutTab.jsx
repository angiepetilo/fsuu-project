import { useState, useMemo } from "react";
import { Search, Clock, CheckCircle2 } from "lucide-react";
import { formatTime12, formatDate } from "@/lib/dateUtils";

export default function EquipmentOutTab({ equipmentBorrowings = [], loading = false }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Strictly list borrowers who currently have physical units out and have NOT yet returned them
  const unreturnedBorrowings = useMemo(() => {
    return equipmentBorrowings.filter(b => {
      const st = (b.status || b.tracking_number?.status || "").toLowerCase();
      // Only active out-on-loan statuses; exclude completed, returned, rejected, cancelled, pending
      return st === "ongoing" || st === "on-going" || st === "borrowed" || st === "claimed" || st === "overdue";
    });
  }, [equipmentBorrowings]);

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set();
    unreturnedBorrowings.forEach(b => {
      const dept = b.program_office || b.department;
      if (dept) set.add(dept);
    });
    return Array.from(set);
  }, [unreturnedBorrowings]);

  // Filter by search query and department
  const filteredRecords = useMemo(() => {
    return unreturnedBorrowings.filter(b => {
      const query = searchQuery.toLowerCase().trim();
      const filer = (b.filer_name || b.requestor || b.applicant_name || "").toLowerCase();
      const equip = (b.equipment_name || b.equipment || "").toLowerCase();
      const ref = (b.reference_code || b.tracking_number?.reference_code || "").toLowerCase();
      const dept = (b.program_office || b.department || "").toLowerCase();
      const barcodes = (Array.isArray(b.assigned_barcodes) ? b.assigned_barcodes.join(" ") : String(b.barcodes || "")).toLowerCase();

      const matchesSearch = !query || filer.includes(query) || equip.includes(query) || ref.includes(query) || dept.includes(query) || barcodes.includes(query);
      const matchesDept = deptFilter === "all" || (b.program_office || b.department) === deptFilter;

      return matchesSearch && matchesDept;
    });
  }, [unreturnedBorrowings, searchQuery, deptFilter]);

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search borrower, unit, barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="all">All Departments ({departments.length})</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Borrower</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Equipment Item</th>
                <th className="py-3.5 px-4 text-center">Units Out</th>
                <th className="py-3.5 px-4">Barcode</th>
                <th className="py-3.5 px-4">Borrow Date</th>
                <th className="py-3.5 px-4">Expected Return</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    Loading equipment out records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                    No active equipment currently out. All physical units are safely returned in inventory.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((b, idx) => {
                  const borrower = b.filer_name || b.requestor || b.applicant_name || "FSUU Borrower";
                  const dept = b.program_office || b.department || "Academic Unit";
                  const equip = b.equipment_name || b.equipment || "AV Equipment Unit";
                  const qty = b.quantity || b.qty || 1;
                  const barcodes = Array.isArray(b.assigned_barcodes) && b.assigned_barcodes.length > 0
                    ? b.assigned_barcodes.join(", ")
                    : b.barcodes || `BAR-${String(b.id).padStart(5, '0')}`;
                  const borrowDate = formatDate(b.date_of_usage || b.date);
                  const returnTime = formatTime12(b.time_end || "17:00");

                  return (
                    <tr key={`eq-out-${b.id || idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-xs">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <p className="font-extrabold text-slate-900 text-xs">{borrower}</p>
                        <p className="font-mono text-[10px] text-slate-400">{b.reference_code || b.tracking_number?.reference_code || `TRK-EQ-${b.id}`}</p>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700 text-xs">{dept}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 text-xs">{equip}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                          {qty}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 font-bold max-w-xs truncate" title={barcodes}>
                        {barcodes}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">{borrowDate}</td>
                      <td className="py-3 px-4 text-xs font-extrabold text-slate-800 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-800">
                          <Clock size={12} className="text-blue-600" />
                          {returnTime}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          ● Out on Loan
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
