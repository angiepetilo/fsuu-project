import { useState, useEffect } from "react";
import { PackageOpen, Loader2, Save, CheckCircle2, Settings2, Lock, Unlock, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import api from "@/lib/axios";

export default function EquipmentStockTab({
  filteredInventory = [],
  setInventoryItems,
  loading = false,
  fetchReportsData,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Local draft state for QTY PRESENT, CONDITION, and NOTES
  const [inventoryDrafts, setInventoryDrafts] = useState({});

  // Per-row override mode — Set of item IDs that have unlocked manual correction
  const [overrideRows, setOverrideRows] = useState(new Set());

  const toggleOverride = (itemId) => {
    setOverrideRows(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const [viewPhotoModal, setViewPhotoModal] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredInventory.length]);

  const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    if (filteredInventory && filteredInventory.length > 0) {
      const drafts = {};
      filteredInventory.forEach((item) => {
        const key = item.id;
        const expected = item.expected_total || item.total_quantity || 1;
        const available = item.available_count ?? item.available ?? expected;
        const maint = item.maintenance ?? item.damaged ?? 0;
        const lost = item.decommissioned ?? item.lost ?? 0;

        let cond = "Good";
        if (maint > 0) cond = "Worn";
        if (lost > 0) cond = "Lost";

        drafts[key] = {
          qty_expected: expected,
          qty_present: available,
          condition: cond,
          notes: item.description || "",
        };
      });
      setInventoryDrafts(drafts);
    }
  }, [filteredInventory]);

  // Stepper handlers
  const handleQtyChange = (key, delta) => {
    setInventoryDrafts(prev => {
      const currentVal = prev[key]?.qty_present ?? 1;
      const newVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [key]: {
          ...prev[key],
          qty_present: newVal,
        }
      };
    });
  };

  const handleConditionChange = (key, conditionVal) => {
    setInventoryDrafts(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        condition: conditionVal,
      }
    }));
  };

  const handleNotesChange = (key, notesText) => {
    setInventoryDrafts(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        notes: notesText,
      }
    }));
  };

  const handleReleasedChange = (key, delta) => {
    setInventoryDrafts(prev => {
      const currentVal = prev[key]?.qty_released ?? 0;
      const newVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [key]: {
          ...prev[key],
          qty_released: newVal,
        }
      };
    });
  };

  const handleDamagedChange = (key, delta) => {
    setInventoryDrafts(prev => {
      const currentVal = prev[key]?.qty_damaged ?? 0;
      const newVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [key]: {
          ...prev[key],
          qty_damaged: newVal,
          condition: newVal > 0 ? "Damaged" : (prev[key]?.condition === "Damaged" ? "Good" : (prev[key]?.condition || "Good")),
        }
      };
    });
  };

  const handleLostChange = (key, delta) => {
    setInventoryDrafts(prev => {
      const currentVal = prev[key]?.qty_lost ?? 0;
      const newVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [key]: {
          ...prev[key],
          qty_lost: newVal,
          condition: newVal > 0 ? "Lost" : (prev[key]?.condition === "Lost" ? "Good" : (prev[key]?.condition || "Good")),
        }
      };
    });
  };

  const handleSubmitInventoryReport = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all(
        filteredInventory.map(item => {
          const draft = inventoryDrafts[item.id];
          if (!draft) return Promise.resolve();
          const mappedStatus = draft.condition === 'Worn' ? 'maintenance' : (draft.condition === 'Damaged' ? 'damaged' : (draft.condition === 'Lost' ? 'decommissioned' : 'available'));

          if (typeof item.id === 'number' && item.id < 1000000) {
            return api.put(`/admin/equipment-types/${item.id}`, {
              available_count: (item.total_quantity || 0) - (draft.qty_released || 0) - (draft.qty_damaged || 0) - (draft.qty_lost || 0),
              status: mappedStatus,
              description: draft.notes,
            }).catch(() => null);
          }
          return Promise.resolve();
        })
      );

      setFeedback("✅ Equipment stock report saved successfully!");
      setTimeout(() => setFeedback(null), 3000);
      if (fetchReportsData) fetchReportsData();
    } catch {
      setFeedback("⚠️ Failed to update stock backend.");
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <PackageOpen size={18} className="text-blue-600" />
            Equipment Inventory &amp; Stock Audit Tab
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time tracking of expected units, released equipment, and damaged/lost items.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmitInventoryReport}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          <span>Save Stock Report</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600" />
          {feedback}
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">ITEM NO.</th>
                <th className="py-3 px-4">CATEGORY</th>
                <th className="py-3 px-4 text-center">QTY EXPECTED</th>
                <th className="py-3 px-4 text-center">QTY PRESENT</th>
                <th className="py-3 px-4 text-center">
                  <span className="flex items-center justify-center gap-1">
                    RELEASED
                    <span className="text-[8px] font-bold text-blue-400 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded normal-case">auto</span>
                  </span>
                </th>
                <th className="py-3 px-4 text-center">
                  <span className="flex items-center justify-center gap-1">
                    DAMAGED
                    <span className="text-[8px] font-bold text-rose-400 bg-rose-50 border border-rose-200 px-1 py-0.5 rounded normal-case">auto</span>
                  </span>
                </th>
                <th className="py-3 px-4 text-center">
                  <span className="flex items-center justify-center gap-1">
                    LOST
                    <span className="text-[8px] font-bold text-amber-500 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded normal-case">auto</span>
                  </span>
                </th>
                <th className="py-3 px-4">NOTES</th>
                <th className="py-3 px-4 text-center">OVERRIDE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin inline mr-2" /> Loading inventory items...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No inventory items registered yet.
                  </td>
                </tr>
              ) : (
                paginatedInventory.map((item, idx) => {
                  const key = item.id;
                  const itemCode = `EQ-00${startIndex + idx + 1}`;
                  const categoryName = item.eq_type || item.eq_name || item.name || item.category || "General";
                  const realTotal = typeof item.calculated_total === 'number'
                    ? item.calculated_total
                    : (typeof item.total_quantity === 'number' ? item.total_quantity : 0);

                  const expectedQty = Math.max(0, realTotal);
                  const initialReleased = Math.max(0, typeof item.released_count === 'number' ? item.released_count : 0);
                  const totalDamaged = Math.max(0, typeof item.damaged_count === 'number' ? item.damaged_count : 0);
                  const totalLost = Math.max(0, typeof item.lost_count === 'number' ? item.lost_count : 0);

                  const draft = inventoryDrafts[key] || {};
                  const currentReleased = draft.qty_released ?? initialReleased;
                  const currentDamaged = draft.qty_damaged ?? totalDamaged;
                  const currentLost = draft.qty_lost ?? totalLost;

                  const availablePresent = typeof item.available_count === 'number' 
                    ? item.available_count 
                    : Math.max(0, expectedQty - currentReleased - currentDamaged - currentLost);

                  const currentDraft = {
                    qty_released: currentReleased,
                    qty_damaged: currentDamaged,
                    qty_lost: currentLost,
                    notes: draft.notes ?? (item.description || ""),
                  };

                  return (
                    <tr key={key || idx} className={`transition-colors ${overrideRows.has(key) ? "bg-amber-50/40 border-l-2 border-amber-300" : "hover:bg-slate-50/60"}`}>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">{itemCode}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">{categoryName}</td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-900 text-sm">{expectedQty}</td>
                      
                      <td className="py-3.5 px-4 text-center font-extrabold text-sm text-emerald-600">
                        {availablePresent} Available
                      </td>

                      {/* RELEASED — read-only by default, unlocked only in Override mode */}
                      <td className="py-3.5 px-4 text-center">
                        {overrideRows.has(key) ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button type="button" onClick={() => handleReleasedChange(key, -1)} className="w-5 h-5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 font-black text-xs flex items-center justify-center cursor-pointer border border-blue-300">-</button>
                            <span className="font-extrabold text-sm min-w-[22px] text-center text-blue-700">{currentDraft.qty_released}</span>
                            <button type="button" onClick={() => handleReleasedChange(key, 1)} className="w-5 h-5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 font-black text-xs flex items-center justify-center cursor-pointer border border-blue-300">+</button>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                            currentDraft.qty_released > 0
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}>{currentDraft.qty_released}</span>
                        )}
                      </td>

                      {/* DAMAGED — read-only by default, unlocked only in Override mode */}
                      <td className="py-3.5 px-4 text-center">
                        {overrideRows.has(key) ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button type="button" onClick={() => handleDamagedChange(key, -1)} className="w-5 h-5 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-xs flex items-center justify-center cursor-pointer border border-rose-300">-</button>
                            <span className="font-extrabold text-sm min-w-[22px] text-center text-rose-600">{currentDraft.qty_damaged}</span>
                            <button type="button" onClick={() => handleDamagedChange(key, 1)} className="w-5 h-5 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-xs flex items-center justify-center cursor-pointer border border-rose-300">+</button>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                            currentDraft.qty_damaged > 0
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}>{currentDraft.qty_damaged}</span>
                        )}
                      </td>

                      {/* LOST — read-only by default, unlocked only in Override mode */}
                      <td className="py-3.5 px-4 text-center">
                        {overrideRows.has(key) ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button type="button" onClick={() => handleLostChange(key, -1)} className="w-5 h-5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-black text-xs flex items-center justify-center cursor-pointer border border-amber-300">-</button>
                            <span className="font-extrabold text-sm min-w-[22px] text-center text-amber-700">{currentDraft.qty_lost}</span>
                            <button type="button" onClick={() => handleLostChange(key, 1)} className="w-5 h-5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-black text-xs flex items-center justify-center cursor-pointer border border-amber-300">+</button>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                            currentDraft.qty_lost > 0
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}>{currentDraft.qty_lost}</span>
                        )}
                      </td>

                      {/* NOTES — always editable */}
                      <td className="py-4 px-4">
                        <input
                          type="text"
                          placeholder="Notes..."
                          value={currentDraft.notes}
                          onChange={(e) => handleNotesChange(key, e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:outline-none focus:border-blue-600 shadow-xs"
                        />
                      </td>

                      {/* OVERRIDE toggle — per row, unlocks steppers for reconciliation */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleOverride(key)}
                          title={overrideRows.has(key) ? "Lock — return to auto-calculated view" : "Override — unlock for manual reconciliation / audit correction"}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                            overrideRows.has(key)
                              ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700"
                          }`}
                        >
                          {overrideRows.has(key) ? (
                            <><Lock size={11} /> Lock</>  
                          ) : (
                            <><Unlock size={11} /> Override</>  
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredInventory.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to{" "}
              <span className="font-extrabold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filteredInventory.length)}</span> of{" "}
              <span className="font-extrabold text-slate-900">{filteredInventory.length}</span> inventory stock items
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
