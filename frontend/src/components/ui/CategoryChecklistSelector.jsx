import React, { useState, useMemo } from "react";
import { Package, Layers, Search, Check, Plus, Minus, X } from "lucide-react";

/**
 * CategoryChecklistSelector — Shared Institutional Category Checklist & Allocation Component
 * Used for:
 * 1. Allowed Equipment & Max Qty in VenuesTab (withMaxQty=true)
 * 2. Built-in Categories in EquipmentCategoriesTab (withMaxQty=false)
 *
 * Utilizes the whitespace effectively with stock badges and stepper controls,
 * and uses `.scrollbar-hover` so scrollbars only reveal when hovered or actively scrolling.
 */
export default function CategoryChecklistSelector({
  items = [],
  selectedIds = [],
  onToggle,
  withMaxQty = false,
  maxQtys = {},
  onMaxQtyChange,
  getStock,
  emptyMessage = "No categories available.",
  maxHeight = "max-h-52",
  className = "",
  showSearch = true,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  // Normalize selectedIds to strings for robust matching
  const selectedSet = useMemo(() => {
    const set = new Set();
    (selectedIds || []).forEach((id) => {
      if (id !== undefined && id !== null && id !== "") {
        set.add(String(id));
      }
    });
    return set;
  }, [selectedIds]);

  const isChecked = (item) => {
    const idStr = String(item.id);
    const nameStr = String(item.name || item.eq_name || "").trim().toLowerCase();
    return (
      selectedSet.has(idStr) ||
      (nameStr && selectedSet.has(nameStr)) ||
      (item.id && selectedSet.has(Number(item.id)))
    );
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase().trim();
    return items.filter((item) => {
      const name = String(item.name || item.eq_name || "").toLowerCase();
      return name.includes(term);
    });
  }, [items, searchTerm]);

  const getAvailableCount = (item) => {
    if (typeof getStock === "function") return getStock(item);
    return item.available_count ?? item.available_quantity ?? item.total_quantity ?? 0;
  };

  const handleStepQty = (e, item, delta) => {
    e.stopPropagation();
    const itemId = item.id;
    const defaultAvail = Math.max(1, getAvailableCount(item) || 1);
    const current = Number(maxQtys?.[itemId] ?? maxQtys?.[String(itemId)] ?? defaultAvail);
    const nextVal = Math.max(1, current + delta);
    onMaxQtyChange?.(itemId, nextVal);
  };

  const handleInputChange = (item, val) => {
    const itemId = item.id;
    const parsed = parseInt(val, 10);
    onMaxQtyChange?.(itemId, isNaN(parsed) || parsed < 1 ? "" : parsed);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Optional Search filter if > 5 items */}
      {showSearch && items.length > 5 && (
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-6 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-normal text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={11} />
            </button>
          )}
        </div>
      )}

      {/* Checklist Card Container */}
      <div
        className={`p-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 rounded-xl ${maxHeight} overflow-y-auto scrollbar-hover space-y-1`}
      >
        {filteredItems.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
            {searchTerm ? "No matching categories found." : emptyMessage}
          </div>
        ) : (
          filteredItems.map((item) => {
            const checked = isChecked(item);
            const stock = getAvailableCount(item);
            const itemName = item.name || item.eq_name || "Category";
            const currentMax = maxQtys?.[item.id] ?? maxQtys?.[String(item.id)] ?? stock ?? 1;

            return (
              <div
                key={item.id}
                onClick={() => onToggle?.(item)}
                className={`flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
                  checked
                    ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/80 shadow-2xs"
                    : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {/* Left: Checkbox + Icon + Category Name */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle?.(item)}
                    onClick={(e) => e.stopPropagation()}
                    className="accent-blue-600 w-3.5 h-3.5 shrink-0 rounded cursor-pointer mt-0.5"
                  />
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                      checked
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300"
                    }`}
                  >
                    {withMaxQty ? <Package size={12} /> : <Layers size={12} />}
                  </div>
                  <span
                    className={`text-xs font-semibold truncate ${
                      checked
                        ? "text-blue-950 dark:text-blue-100 font-bold"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                    title={itemName}
                  >
                    {itemName}
                  </span>
                </div>

                {/* Middle (Whitespace utilization): Stock Available Badge */}
                <div className="shrink-0 flex items-center">
                  <span
                    className={`text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                      checked
                        ? "bg-blue-100/60 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60"
                        : "bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border-slate-200/70 dark:border-slate-700/70"
                    }`}
                  >
                    {stock} {stock === 1 ? "unit" : "units"} in stock
                  </span>
                </div>

                {/* Right: Max Qty Stepper (if withMaxQty) OR Linked Badge */}
                {withMaxQty ? (
                  <div
                    className="shrink-0 flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {checked ? (
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-blue-200 dark:border-blue-800 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 pl-1 uppercase tracking-tight">
                          Max:
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleStepQty(e, item, -1)}
                          disabled={Number(currentMax) <= 1}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                          title="Decrease max quantity"
                        >
                          <Minus size={11} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={stock > 0 ? stock : 999}
                          value={currentMax ?? ""}
                          onChange={(e) => handleInputChange(item, e.target.value)}
                          className="w-10 text-center py-0.5 bg-transparent font-mono font-bold text-xs text-blue-700 dark:text-blue-300 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleStepQty(e, item, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer transition-colors"
                          title="Increase max quantity"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80">
                        Excluded
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="shrink-0 flex items-center">
                    {checked ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <Check size={11} className="shrink-0" />
                        <span>Linked</span>
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-md">
                        Unlinked
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
