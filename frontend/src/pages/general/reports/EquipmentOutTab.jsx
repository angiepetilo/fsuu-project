import { useState, useMemo, useEffect } from "react";
import { Search, Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { formatTime12, formatDate } from "@/lib/dateUtils";
import { getOverdueMinutes } from "@/lib/dateTimeUtils";

export default function EquipmentOutTab({ equipmentBorrowings = [], equipmentUnits = [], loading = false }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'out_on_loan' | 'returned' | 'overdue'
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, deptFilter, statusFilter]);

  // Helper to extract assigned unit metadata: Seq No, Brand, Model, Serial No
  const getAssignedUnitsDetails = (b) => {
    const barcodes = extractBarcodes(b);
    if (barcodes.length === 0) return [];
    return barcodes.map((code) => {
      const cleanCode = String(code).trim().toUpperCase();
      const matchedUnit = (equipmentUnits || []).find((u) => {
        const candidates = [
          u.barcode,
          u.serial_number,
          u.code,
          String(u.id),
          u.seq_no ? `#${String(u.seq_no).replace(/^#/, '')}` : null,
        ].filter(Boolean).map((s) => String(s).trim().toUpperCase());
        return candidates.includes(cleanCode);
      });

      if (matchedUnit) {
        const rawSeq = matchedUnit.seq_no ?? matchedUnit.sequence_no;
        const seqNo = rawSeq !== undefined && rawSeq !== null && String(rawSeq).trim() !== ""
          ? (String(rawSeq).trim().startsWith("#") ? String(rawSeq).trim() : `#${String(rawSeq).trim()}`)
          : null;
        const brand = matchedUnit.brand ? String(matchedUnit.brand).trim() : "";
        const model = matchedUnit.model ? String(matchedUnit.model).trim() : "";
        const serialNo = matchedUnit.serial_number || matchedUnit.barcode || code;
        const category = matchedUnit.equipment_type?.name
          || matchedUnit.equipment_type?.eq_name
          || matchedUnit.equipmentType?.name
          || matchedUnit.category
          || matchedUnit.name
          || "";

        let builtIns = matchedUnit.built_in_units;
        if (typeof builtIns === "string") {
          try { builtIns = JSON.parse(builtIns); } catch { builtIns = []; }
        }

        return {
          code,
          serialNo,
          seqNo,
          brand,
          model,
          category,
          built_in_units: Array.isArray(builtIns) ? builtIns : [],
        };
      }
      return {
        code,
        serialNo: code,
        seqNo: null,
        brand: "",
        model: "",
        category: "",
        built_in_units: [],
      };
    });
  };

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

  // Helper to conclude what equipment categories are under this equipment unit / borrowing
  const extractEquipmentCategories = (b, assignedDetails = []) => {
    const catList = [];
    if (Array.isArray(b.items) && b.items.length > 0) {
      b.items.forEach(it => {
        let name = it.equipment_type?.name || it.equipment_type?.eq_name || it.equipmentType?.name || it.equipment_name || it.name || "";
        if (name) {
          const hasBuiltIn = Boolean(
            it.equipment_type?.built_in_units ||
            it.equipmentType?.built_in_units ||
            it.has_built_in ||
            name.toLowerCase().includes("built-in") ||
            name.toLowerCase().includes("w/ built-in")
          );
          if (hasBuiltIn && !name.toLowerCase().includes("built-in")) {
            name = `${name} w/ built-in`;
          }
          catList.push(name);
        }
      });
    }

    if (assignedDetails.length > 0) {
      assignedDetails.forEach(u => {
        if (u.category && !catList.some(c => c.toLowerCase() === u.category.toLowerCase())) {
          catList.push(u.category);
        }
      });
    }

    if (catList.length === 0) {
      const fallback = b.equipment_name || b.equipment || b.item_name || "AV Equipment";
      catList.push(fallback);
    }

    return Array.from(new Set(catList));
  };

  // Helper to calculate total equipment units released (counting units & linked built-in components)
  const calculateReleasedUnitsCount = (b, assignedDetails, qty) => {
    let physicalCount = 0;
    if (assignedDetails.length > 0) {
      assignedDetails.forEach(u => {
        physicalCount += 1;
        if (Array.isArray(u.built_in_units) && u.built_in_units.length > 0) {
          physicalCount += u.built_in_units.length;
        }
      });
    }
    return Math.max(physicalCount, assignedDetails.length, qty);
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

  // Helper to format returned timestamp
  const formatReturnedAt = (raw) => {
    if (!raw) return null;
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return String(raw);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return String(raw);
    }
  };

  // Retain all out-on-loan and returned records for comprehensive tracking
  const validBorrowings = useMemo(() => {
    return equipmentBorrowings.filter(b => {
      const st = (b.status || b.tracking_number?.status || "").toLowerCase();
      return [
        "ongoing", "on-going", "borrowed", "claimed", "released", "in_use", "in-use", "overdue",
        "returned", "completed", "late return", "late_return"
      ].includes(st);
    });
  }, [equipmentBorrowings]);

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set();
    validBorrowings.forEach(b => {
      const dept = b.program_office || b.department?.name || b.department;
      if (dept) set.add(dept);
    });
    return Array.from(set);
  }, [validBorrowings]);

  // Status counts for filter chips/options
  const statusCounts = useMemo(() => {
    let outCount = 0;
    let retCount = 0;
    let overdueCount = 0;

    validBorrowings.forEach(b => {
      const st = (b.status || b.tracking_number?.status || "").toLowerCase();
      const isRet = ["returned", "completed", "late return", "late_return"].includes(st);
      if (isRet) {
        retCount++;
      } else {
        const isOverdue = getOverdueMinutes(b.date_of_usage || b.start_datetime, b.time_end || b.end_datetime) > 0;
        if (isOverdue) overdueCount++;
        else outCount++;
      }
    });

    return { outCount, retCount, overdueCount };
  }, [validBorrowings]);

  // Filter by search query, department, and status
  const filteredRecords = useMemo(() => {
    return validBorrowings.filter(b => {
      const query = searchQuery.toLowerCase().trim();
      const filer = (b.filer_name || b.requestor || b.applicant_name || "").toLowerCase();
      const equip = extractEquipmentName(b).toLowerCase();
      const ref = (b.reference_code || b.tracking_number?.reference_code || "").toLowerCase();
      const dept = (b.program_office || b.department?.name || b.department || "").toLowerCase();
      const barcodes = extractBarcodes(b).join(" ").toLowerCase();

      const cats = extractEquipmentCategories(b).join(" ").toLowerCase();

      const matchesSearch = !query 
        || filer.includes(query) 
        || equip.includes(query) 
        || ref.includes(query) 
        || dept.includes(query) 
        || barcodes.includes(query)
        || cats.includes(query);

      const currentDept = b.program_office || b.department?.name || b.department;
      const matchesDept = deptFilter === "all" || currentDept === deptFilter;

      const st = (b.status || b.tracking_number?.status || "").toLowerCase();
      const isReturned = ["returned", "completed", "late return", "late_return"].includes(st);
      const isOverdue = !isReturned && getOverdueMinutes(b.date_of_usage || b.start_datetime, b.time_end || b.end_datetime) > 0;

      let matchesStatus = true;
      if (statusFilter === "returned") {
        matchesStatus = isReturned;
      } else if (statusFilter === "overdue") {
        matchesStatus = isOverdue;
      } else if (statusFilter === "out_on_loan") {
        matchesStatus = !isReturned && !isOverdue;
      }

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [validBorrowings, searchQuery, deptFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search borrower, unit, barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="all">All Statuses ({validBorrowings.length})</option>
            <option value="out_on_loan">Out on Loan ({statusCounts.outCount})</option>
            <option value="returned">Returned ({statusCounts.retCount})</option>
            <option value="overdue">Overdue ({statusCounts.overdueCount})</option>
          </select>

          {/* Department Filter Dropdown */}
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12">#</th>
                <th className="py-3.5 px-4 w-48">Borrower</th>
                <th className="py-3.5 px-4 w-28">Department</th>
                <th className="py-3.5 px-4">Released Equipment & Units</th>
                <th className="py-3.5 px-4 text-center w-20">Units</th>
                <th className="py-3.5 px-4 w-28">Borrow Date</th>
                <th className="py-3.5 px-4 w-44">Expected / Return Time</th>
                <th className="py-3.5 px-4 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    Loading equipment borrowing records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    <CheckCircle2 size={24} className="mx-auto text-slate-300 mb-2" />
                    No equipment borrowing records matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((b, idx) => {
                    const rowGlobalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                    const borrower = b.filer_name || b.requestor || b.applicant_name || "Borrower";
                    const refCode = b.tracking_number?.reference_code || b.reference_code || `TRK-EQ-${b.id}`;
                    const dept = b.program_office || b.department?.name || b.department || "Academic Unit";
                    const equip = extractEquipmentName(b);
                    const qty = extractUnitsOut(b);
                    const assignedDetails = getAssignedUnitsDetails(b);
                    const categories = extractEquipmentCategories(b, assignedDetails);
                    const releasedUnitsCount = calculateReleasedUnitsCount(b, assignedDetails, qty);
                    const borrowDate = formatDate(b.date_of_usage || b.start_datetime || b.date);
                    const returnTime = b.time_end ? formatTime12(b.time_end) : "17:00";
                    const overdueMins = getOverdueMinutes(b.date_of_usage || b.start_datetime, b.time_end || b.end_datetime);

                    const st = (b.status || b.tracking_number?.status || "").toLowerCase();
                    const isReturned = ["returned", "completed", "late return", "late_return"].includes(st);
                    const actualReturnTime = b.actual_return_time ? formatTime12(b.actual_return_time)
                      : b.returned_time ? formatTime12(b.returned_time)
                      : formatReturnedAt(b.returned_at || b.post_inspected_at || (isReturned ? b.updated_at : null));

                    return (
                      <tr key={`eq-out-${b.id || idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">{rowGlobalIdx}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">{borrower}</p>
                          <p className="font-mono text-[10px] text-slate-400 font-bold">{refCode}</p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs">{dept}</td>
                        <td className="py-3.5 px-4 min-w-[320px]">
                          {assignedDetails.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {assignedDetails.map((u, uIdx) => {
                                const brandModel = [u.brand, u.model].filter(Boolean).join(" ");
                                const catName = u.category || (categories[uIdx] || "Equipment Unit");
                                return (
                                  <div
                                    key={uIdx}
                                    className="p-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-1.5 shadow-2xs"
                                  >
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-2xs">
                                        {catName}
                                      </span>
                                      {u.seqNo && (
                                        <span className="text-[10.5px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                          {u.seqNo}
                                        </span>
                                      )}
                                      {brandModel && (
                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                          {brandModel}
                                        </span>
                                      )}
                                    </div>
                                    {u.serialNo && (
                                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                        <span className="text-[10px] uppercase font-sans text-slate-400 font-semibold tracking-wider">Barcode:</span>
                                        <span className="font-bold text-blue-700 dark:text-blue-400 select-all">{u.serialNo}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{equip}</p>
                              <span className="text-[10.5px] text-amber-600 dark:text-amber-400 font-semibold">
                                Pending physical unit assignment
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                            {releasedUnitsCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{borrowDate}</td>
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                          {isReturned ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                Returned: {actualReturnTime || returnTime}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                Expected: {returnTime} {b.returned_at ? `• ${formatDate(b.returned_at)}` : ""}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200 font-extrabold">
                                <Clock size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                Expected: {returnTime}
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                Out on loan
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isReturned ? (
                            <span className="text-xs font-semibold text-emerald-600">
                              Returned
                            </span>
                          ) : overdueMins > 0 ? (
                            <span className="text-xs font-semibold text-rose-600">
                              Overdue ({overdueMins}m)
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600">
                              Out on Loan
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

      {/* Pagination Bar */}
      {filteredRecords.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">
            Showing <span className="font-extrabold text-slate-900 dark:text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900 dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)}</span> of{" "}
            <span className="font-extrabold text-slate-900 dark:text-white">{filteredRecords.length}</span> records
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
              Page {currentPage} of {Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE))}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE)), p + 1))}
              disabled={currentPage >= Math.ceil(filteredRecords.length / ITEMS_PER_PAGE)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
