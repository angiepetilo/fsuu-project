import { useState, useEffect } from "react";
import { PackageOpen, Loader2, Save, CheckCircle2, ShieldCheck, Clock, Wrench, Edit3, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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

  // Local draft state for QTY PRESENT, CONDITION, and NOTES (Image 2 prototype)
  const [inventoryDrafts, setInventoryDrafts] = useState({});

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
              available_count: draft.qty_present,
              status: mappedStatus,
              description: draft.notes,
            }).catch(() => null);
          }
          return Promise.resolve();
        })
      );

      setFeedback("✅ Inventory Audit Report submitted & stock records updated!");
      setTimeout(() => setFeedback(null), 4000);
      if (fetchReportsData) fetchReportsData();
    } catch {
      alert("Failed to submit inventory report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <PackageOpen size={18} className="text-blue-600" />
            Equipment Inventory Stock & Health Report
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Verify and update physical equipment condition & stock numbers.
          </p>
        </div>

        <button
          onClick={handleSubmitInventoryReport}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-50 w-fit"
        >
          {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          <span>Submit Inventory Report</span>
        </button>
      </div>

      {feedback && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 size={16} />
          {feedback}
        </div>
      )}

      {/* Inventory Table (Image 2 Format) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">ITEM NO.</th>
                <th className="py-3 px-4">CATEGORY</th>
                <th className="py-3 px-4 text-center">QTY EXPECTED</th>
                <th className="py-3 px-4 text-center">QTY PRESENT</th>
                <th className="py-3 px-4 text-center">RELEASED</th>
                <th className="py-3 px-4 text-center">DAMAGED / LOST</th>
                <th className="py-3 px-4">CONDITION</th>
                <th className="py-3 px-4">NOTES</th>
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

                  const realReleased = typeof item.released_count === 'number'
                    ? item.released_count
                    : (typeof item.on_loan === 'number' ? item.on_loan : 0);

                  const releasedQty = Math.min(expectedQty, Math.max(0, realReleased));
                  const damagedLostQty = typeof item.damaged_count === 'number' ? item.damaged_count : 0;

                  const currentDraft = inventoryDrafts[key] || {
                    qty_present: expectedQty === 0 ? 0 : Math.max(0, expectedQty - releasedQty - damagedLostQty),
                    condition: "Good",
                    notes: item.description || "",
                  };

                  return (
                    <tr key={key || idx} className="hover:bg-slate-50/60 transition-colors">
                      {/* ITEM NO */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                        {itemCode}
                      </td>

                      {/* CATEGORY */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {categoryName}
                      </td>

                      {/* QTY EXPECTED */}
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-900 text-sm">
                        {expectedQty}
                      </td>

                      {/* QTY PRESENT */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(key, -1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer transition-all"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-sm text-slate-900 min-w-[20px] text-center">
                            {currentDraft.qty_present}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(key, 1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer transition-all"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* RELEASED */}
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-800">
                        {releasedQty > 0 ? (
                          <span className="text-blue-700 font-bold">{releasedQty} Released</span>
                        ) : (
                          <span className="text-slate-400 font-medium">0</span>
                        )}
                      </td>

                      {/* DAMAGED / LOST */}
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-800">
                        {damagedLostQty > 0 ? (
                          <span className="text-rose-600 font-bold">{damagedLostQty}</span>
                        ) : (
                          <span className="text-slate-400 font-medium">0</span>
                        )}
                      </td>

                      {/* CONDITION (Clean Dropdown) */}
                      <td className="py-4 px-4">
                        <select
                          value={currentDraft.condition}
                          onChange={(e) => handleConditionChange(key, e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-xs font-extrabold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer shadow-xs"
                        >
                          <option value="Good">Good</option>
                          <option value="Worn">Worn</option>
                          <option value="Damaged">Damaged</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </td>

                      {/* NOTES (Text Input) */}
                      <td className="py-4 px-4">
                        <input
                          type="text"
                          placeholder="Notes..."
                          value={currentDraft.notes}
                          onChange={(e) => handleNotesChange(key, e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:outline-none focus:border-blue-600 shadow-xs"
                        />
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
