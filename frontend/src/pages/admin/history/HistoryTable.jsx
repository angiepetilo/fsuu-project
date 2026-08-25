import { Loader2, Eye, Pencil, RotateCcw, Trash2, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * HistoryTable — Renders Venue or Equipment history records table with ActionMenuPopover and pagination.
 */
export default function HistoryTable({
  historyType,
  loading,
  filteredRecords,
  paginatedList,
  startIndex,
  ITEMS_PER_PAGE,
  setItemsPerPage,
  currentPage,
  totalPages,
  setCurrentPage,
  activeMenuId,
  setActiveMenuId,
  activeMenuEl,
  setActiveMenuEl,
  ActionMenuPopover,
  formatDate,
  formatTimeRange,
  setSelectedVenueModal,
  setSelectedEquipModal,
  handleOpenEdit,
  handleUndoHistory,
  handleDeleteHistory,
}) {
  if (historyType === "venue") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                {["#", "Track Number", "Requestor", "Department", "Venue", "Date", "Time", "Outcome", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Loader2 size={18} className="animate-spin inline mr-2" /> Loading history...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-medium">
                    No venue booking history records found.
                  </td>
                </tr>
              ) : (
                paginatedList.map((b, idx) => {
                  const refCode = b.reference_code || b.tracking_number?.reference_code || (typeof b.tracking_number === 'string' ? b.tracking_number : '') || `TRK-AVR${b.id}`;
                  const requestor = b.filer_name || b.requestor || "FSUU Filer";
                  const department = b.program_office || b.department || "Academic Dept";
                  const venueName = b.venue_name || b.venue || "AVR Auditorium 1";
                  const usageDate = formatDate(b.date_of_usage || b.date);
                  const timeRange = formatTimeRange(b.time_start, b.time_end);
                  const displayIndex = startIndex + idx + 1;
                  const isBreach = (b.status || "").toLowerCase() === "damaged" || Boolean(b.has_damage) || Boolean(b.violation);

                  return (
                    <tr key={`history-log-venue-${b.id || idx}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono">{displayIndex}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">{refCode}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{requestor}</td>
                      <td className="px-4 py-3 text-slate-700">{department}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 font-mono">{venueName}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono whitespace-nowrap">{usageDate}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono whitespace-nowrap">{timeRange}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isBreach ? (
                          <span className="font-mono text-xs font-bold text-rose-600 uppercase">
                            ● Policy Violation
                          </span>
                        ) : (
                          <span className="font-mono text-xs font-bold text-emerald-600 uppercase">
                            ● Good
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (activeMenuId === `v-${b.id}`) {
                              setActiveMenuId(null);
                              setActiveMenuEl(null);
                            } else {
                              setActiveMenuId(`v-${b.id}`);
                              setActiveMenuEl(e.currentTarget);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer shadow-2xs"
                          title="Actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        <ActionMenuPopover
                          isOpen={activeMenuId === `v-${b.id}`}
                          buttonEl={activeMenuEl}
                          onClose={() => { setActiveMenuId(null); setActiveMenuEl(null); }}
                        >
                          <button
                            type="button"
                            onClick={() => { setSelectedVenueModal(b); setActiveMenuId(null); setActiveMenuEl(null); }}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <Eye size={13} className="text-slate-600" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleUndoHistory(b.id, refCode, "venue"); setActiveMenuId(null); setActiveMenuEl(null); }}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <RotateCcw size={13} className="text-slate-600" /> Undo
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleDeleteHistory(b.id, refCode, "venue"); setActiveMenuId(null); }}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </ActionMenuPopover>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 size={20} className="animate-spin inline mr-2" /> Loading history...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium text-xs">
              No venue booking history records found.
            </div>
          ) : (
            paginatedList.map((b, idx) => {
              const refCode = b.reference_code || b.tracking_number?.reference_code || `TRK-AVR${b.id}`;
              const requestor = b.filer_name || b.requestor || "FSUU Filer";
              const department = b.program_office || b.department || "Academic Dept";
              const venueName = b.venue_name || b.venue || "AVR Auditorium 1";
              const usageDate = formatDate(b.date_of_usage || b.date);
              const timeRange = formatTimeRange(b.time_start, b.time_end);
              const isBreach = (b.status || "").toLowerCase() === "damaged" || Boolean(b.has_damage) || Boolean(b.violation);

              return (
                <div key={`mob-v-${b.id || idx}`} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-extrabold text-xs text-slate-900">{refCode}</span>
                    {isBreach ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                        Violation
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Good
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-sm text-slate-900">{requestor}</p>
                    <p className="text-xs text-slate-500 font-medium">{department} • <span className="font-mono text-slate-700">{venueName}</span></p>
                  </div>

                  <p className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    📅 {usageDate} | ⏰ {timeRange}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedVenueModal(b)}
                      className="flex-1 min-h-[40px] px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Eye size={14} /> View Details
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUndoHistory(b.id, refCode, "venue")}
                      className="min-h-[40px] px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                      title="Undo"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {filteredRecords.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-white border-t border-slate-200 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">Rows per page:</span>
                <select
                  value={ITEMS_PER_PAGE}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-transparent border border-slate-200 rounded-md px-1 py-0.5 outline-none focus:border-slate-400 font-bold cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div>
                Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{" "}
                <span className="font-bold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filteredRecords.length)}</span> of{" "}
                <span className="font-bold text-slate-900">{filteredRecords.length}</span> records
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
              >
                <ChevronLeft size={13} /> Prev
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                {["#", "Track Number", "Requestor", "Department", "Equipment", "Quantity", "Date", "Time", "Outcome", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <Loader2 size={18} className="animate-spin inline mr-2" /> Loading history...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-medium">
                    No equipment borrowing history records found.
                  </td>
                </tr>
              ) : (
                paginatedList.map((b, idx) => {
                  const refCode = b.reference_code || b.tracking_number?.reference_code || (typeof b.tracking_number === 'string' ? b.tracking_number : '') || `EQUIP-REQ-${b.id}`;
                  const requestor = b.filer_name || b.requestor || "FSUU Filer";
                  const department = b.program_office || b.department || "Academic Dept";
                  const equipment = b.equipment_name || b.equipment || "Epson Digital Projector HD";
                  const quantity = b.quantity || b.qty || 1;
                  const usageDate = formatDate(b.date_of_usage || b.date);
                  const timeRange = formatTimeRange(b.time_start, b.time_end);
                  const displayIndex = startIndex + idx + 1;
                  const isDamaged = (b.status || "").toLowerCase() === "damaged" || Boolean(b.has_damage);
                  const isLost = (b.status || "").toLowerCase() === "lost" || Boolean(b.is_lost);
                  const isLate = Boolean(b.is_late) || b.is_late === 1 || b.is_late === "1" || b.is_late === true || (b.status || "").toLowerCase().includes("late") || (b.timeliness || "").toLowerCase().includes("late") || String(b.violation_type || "").toLowerCase().includes("late") || String(b.violation || "").toLowerCase().includes("late");
                  const isOtherBreach = Boolean(b.violation) && !isLate && !isDamaged && !isLost;
                  const isBreach = isDamaged || isLost || isOtherBreach;
                  return (
                    <tr key={`history-log-eq-${b.id || idx}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono">{displayIndex}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">{refCode}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{requestor}</td>
                      <td className="px-4 py-3 text-slate-700">{department}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 font-mono">{equipment}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{quantity} Units</td>
                      <td className="px-4 py-3 text-slate-600 font-mono whitespace-nowrap">{usageDate}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono whitespace-nowrap">{timeRange}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isLate ? (
                          <span className="font-mono text-xs font-bold text-amber-600 uppercase">
                            ● Late Return
                          </span>
                        ) : (
                          <span className="font-mono text-xs font-bold text-emerald-600 uppercase">
                            ● Good
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (activeMenuId === `e-${b.id}`) {
                              setActiveMenuId(null);
                              setActiveMenuEl(null);
                            } else {
                              setActiveMenuId(`e-${b.id}`);
                              setActiveMenuEl(e.currentTarget);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer shadow-2xs"
                          title="Actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        <ActionMenuPopover
                          isOpen={activeMenuId === `e-${b.id}`}
                          buttonEl={activeMenuEl}
                          onClose={() => { setActiveMenuId(null); setActiveMenuEl(null); }}
                        >
                          <button
                            type="button"
                            onClick={() => { setSelectedEquipModal(b); setActiveMenuId(null); setActiveMenuEl(null); }}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <Eye size={13} className="text-slate-600" /> View
                          </button>

                          <button
                            type="button"
                            onClick={() => { handleUndoHistory(b.id, refCode, "equipment"); setActiveMenuId(null); setActiveMenuEl(null); }}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <RotateCcw size={13} className="text-slate-600" /> Undo
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleDeleteHistory(b.id, refCode, "equipment"); setActiveMenuId(null); }}
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </ActionMenuPopover>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 size={20} className="animate-spin inline mr-2" /> Loading history...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium text-xs">
              No equipment borrowing history records found.
            </div>
          ) : (
            paginatedList.map((b, idx) => {
              const refCode = b.reference_code || b.tracking_number?.reference_code || `EQUIP-REQ-${b.id}`;
              const requestor = b.filer_name || b.requestor || "FSUU Filer";
              const department = b.program_office || b.department || "Academic Dept";
              const equipment = b.equipment_name || b.equipment || "Epson Digital Projector HD";
              const quantity = b.quantity || b.qty || 1;
              const usageDate = formatDate(b.date_of_usage || b.date);
              const timeRange = formatTimeRange(b.time_start, b.time_end);
              const isLate = Boolean(b.is_late) || b.is_late === 1 || b.is_late === "1" || b.is_late === true || (b.status || "").toLowerCase().includes("late");

              return (
                <div key={`mob-eq-${b.id || idx}`} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-extrabold text-xs text-slate-900">{refCode}</span>
                    {isLate ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                        Late Return
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Good
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-sm text-slate-900">{requestor}</p>
                    <p className="text-xs text-slate-500 font-medium">{department} • <span className="font-mono text-slate-700">{equipment} ({quantity} units)</span></p>
                  </div>

                  <p className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    📅 {usageDate} | ⏰ {timeRange}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedEquipModal(b)}
                      className="flex-1 min-h-[40px] px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Eye size={14} /> View Details
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUndoHistory(b.id, refCode, "equipment")}
                      className="min-h-[40px] px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                      title="Undo"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      {/* Pagination Footer */}
      {filteredRecords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-white border-t border-slate-200 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">Rows per page:</span>
              <select
                value={ITEMS_PER_PAGE}
                onChange={(e) => setItemsPerPage && setItemsPerPage(Number(e.target.value))}
                className="bg-transparent border border-slate-200 rounded-md px-1 py-0.5 outline-none focus:border-slate-400 font-bold cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div>
              Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filteredRecords.length)}</span> of{" "}
              <span className="font-bold text-slate-900">{filteredRecords.length}</span> records
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
            >
              <ChevronLeft size={13} /> Prev
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
