import { useState, useMemo } from "react";
import { Search, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatTime12, formatDate } from "@/lib/dateUtils";
import { getOverdueMinutes } from "@/lib/dateTimeUtils";

export default function EquipmentOutTab({ equipmentBorrowings = [], loading = false }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Helper to extract assigned unit barcodes without placeholders
  const extractBarcodes = (b) => {
    let codes = [];
    if (b.assigned_units) {
      if (typeof b.assigned_units === "object" && !Array.isArray(b.assigned_units)) {
        codes = Object.values(b.assigned_units).filter(Boolean);
      } else if (Array.isArray(b.assigned_units)) {
        codes = b.assigned_units.filter(Boolean);
      } else if (typeof b.assigned_units === "string") {
        try {
          const parsed = JSON.parse(b.assigned_units);
          if (typeof parsed === "object") {
            codes = Object.values(parsed).filter(Boolean);
          }
        } catch {
          codes = [b.assigned_units];
        }
      }
    }
    if (codes.length === 0 && Array.isArray(b.assigned_barcodes)) {
      codes = b.assigned_barcodes.filter(Boolean);
    }
    if (codes.length === 0 && b.barcodes) {
      codes = Array.isArray(b.barcodes) ? b.barcodes.filter(Boolean) : [b.barcodes];
    }
    return Array.from(new Set(codes.map(c => String(c).trim()).filter(Boolean)));
  };

  // Helper to extract clean equipment item name(s)
  const extractEquipmentName = (b) => {
    if (Array.isArray(b.items) && b.items.length > 0) {
      if (b.items.length === 1) {
        const it = b.items[0];
        return it.equipment_type?.name || it.equipment_type?.eq_name || it.equipmentType?.name || it.equipment_name || it.name || "Equipment";
      }
      return b.items.map(it => {
        const name = it.equipment_type?.name || it.equipment_type?.eq_name || it.equipmentType?.name || it.equipment_name || it.name || "Item";
        const qty = it.quantity_requested || it.quantity || 1;
        return `${qty}x ${name}`;
      }).join(", ");
    }
    return b.equipment_name || b.equipment || b.item_name || "AV Equipment";
  };

  // Helper to calculate total physical units out
  const extractUnitsOut = (b) => {
    if (Array.isArray(b.items) && b.items.length > 0) {
      return b.items.reduce((sum, it) => sum + (parseInt(it.quantity_requested || it.quantity, 10) || 1), 0);
    }
    return parseInt(b.quantity || b.qty, 10) || 1;
  };

  // Strictly list borrowers who currently have physical units out and have NOT yet returned them
  const unreturnedBorrowings = useMemo(() => {
    return equipmentBorrowings.filter(b => {
      const st = (b.status || b.tracking_number?.status || "").toLowerCase();
      // Only active out-on-loan statuses; exclude completed, returned, rejected, cancelled, pending, approved
      return ["ongoing", "on-going", "borrowed", "claimed", "released", "in_use", "in-use", "overdue"].includes(st);
    });
  }, [equipmentBorrowings]);

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set();
    unreturnedBorrowings.forEach(b => {
      const dept = b.program_office || b.department?.name || b.department;
      if (dept) set.add(dept);
    });
    return Array.from(set);
  }, [unreturnedBorrowings]);

  // Filter by search query and department
  const filteredRecords = useMemo(() => {
    return unreturnedBorrowings.filter(b => {
      const query = searchQuery.toLowerCase().trim();
      const filer = (b.filer_name || b.requestor || b.applicant_name || "").toLowerCase();
      const equip = extractEquipmentName(b).toLowerCase();
      const ref = (b.reference_code || b.tracking_number?.reference_code || "").toLowerCase();
      const dept = (b.program_office || b.department?.name || b.department || "").toLowerCase();
      const barcodes = extractBarcodes(b).join(" ").toLowerCase();

      const matchesSearch = !query 
        || filer.includes(query) 
        || equip.includes(query) 
        || ref.includes(query) 
        || dept.includes(query) 
        || barcodes.includes(query);

      const currentDept = b.program_office || b.department?.name || b.department;
      const matchesDept = deptFilter === "all" || currentDept === deptFilter;

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
                  const borrower = b.filer_name || b.requestor || b.applicant_name || "Borrower";
                  const refCode = b.tracking_number?.reference_code || b.reference_code || `TRK-EQ-${b.id}`;
                  const dept = b.program_office || b.department?.name || b.department || "Academic Unit";
                  const equip = extractEquipmentName(b);
                  const qty = extractUnitsOut(b);
                  const barcodes = extractBarcodes(b);
                  const borrowDate = formatDate(b.date_of_usage || b.start_datetime || b.date);
                  const returnTime = b.time_end ? formatTime12(b.time_end) : "17:00";
                  const overdueMins = getOverdueMinutes(b.date_of_usage || b.start_datetime, b.time_end || b.end_datetime);

                  return (
                    <tr key={`eq-out-${b.id || idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-xs">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <p className="font-extrabold text-slate-900 text-xs">{borrower}</p>
                        <p className="font-mono text-[10px] text-slate-400 font-bold">{refCode}</p>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700 text-xs">{dept}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 text-xs">{equip}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                          {qty}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 font-bold max-w-xs truncate">
                        {barcodes.length > 0 ? (
                          <span title={barcodes.join(", ")} className="text-blue-700 font-bold">
                            {barcodes.join(", ")}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-normal">Not Tagged</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">{borrowDate}</td>
                      <td className="py-3 px-4 text-xs font-extrabold text-slate-800 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-800">
                          <Clock size={12} className="text-blue-600" />
                          {returnTime}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {overdueMins > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle size={10} className="text-rose-600 shrink-0" />
                            Overdue ({overdueMins}m)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            ● Out on Loan
                          </span>
                        )}
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
