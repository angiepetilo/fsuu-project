import React, { useState, useEffect, useRef } from "react";
import { PackageOpen, Wrench, Check, Search, ChevronDown, X, CheckCircle2, Plus, Minus } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Typeable & Selectable Combobox for Physical Barcode Slot
 */
function SlotBarcodeSelector({
  unitKey,
  uIdx,
  reqQty,
  categoryName,
  currentBarcode,
  availableUnits,
  assignedUnitSelections,
  onSelectBarcode,
  hasStock,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(currentBarcode || "");
  const containerRef = useRef(null);

  // Sync internal search input with external value changes
  useEffect(() => {
    setSearchTerm(currentBarcode || "");
  }, [currentBarcode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Exclude barcodes already chosen in OTHER slots of this modal
  const otherSelectedBarcodes = Object.entries(assignedUnitSelections || {})
    .filter(([k, v]) => k !== unitKey && Boolean(v))
    .map(([_, v]) => String(v).trim().toUpperCase());

  // Filter available units based on slot uniqueness
  const slotEligibleUnits = availableUnits.filter((u) => {
    const bCode = String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase();
    const isCurrent = bCode === String(currentBarcode).trim().toUpperCase();
    return isCurrent || !otherSelectedBarcodes.includes(bCode);
  });

  // Search filtered options
  const searchFiltered = slotEligibleUnits.filter((u) => {
    const bCode = String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).toLowerCase();
    const uName = String(u.name || categoryName || "").toLowerCase();
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return bCode.includes(q) || uName.includes(q);
  });

  const handleChoose = (bCode) => {
    onSelectBarcode(bCode);
    setSearchTerm(bCode);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelectBarcode("");
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);

    // Auto-match if exact barcode typed
    const exactMatch = slotEligibleUnits.find((u) => {
      const bCode = String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase();
      return bCode === val.trim().toUpperCase();
    });

    if (exactMatch) {
      const exactCode = exactMatch.barcode || exactMatch.serial_number || exactMatch.code || `UNIT-${exactMatch.id}`;
      onSelectBarcode(exactCode);
    } else if (!val) {
      onSelectBarcode("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchFiltered.length > 0) {
        const top = searchFiltered[0];
        const topCode = top.barcode || top.serial_number || top.code || `UNIT-${top.id}`;
        handleChoose(topCode);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Typeable Input + Dropdown Toggle Bar */}
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={currentBarcode ? "Change unit barcode..." : "Type barcode or choose from dropdown..."}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full py-2 pl-3 pr-16 bg-white border rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none transition-all ${
            currentBarcode
              ? "border-emerald-300 ring-1 ring-emerald-200 bg-emerald-50/20"
              : "border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
          }`}
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {currentBarcode && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
              title="Clear / Unassign slot"
            >
              <X size={13} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Toggle unit dropdown"
          >
            <ChevronDown size={14} className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Options Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10.5px] font-bold text-slate-500 bg-slate-50">
            <span>AVAILABLE BARCODES FOR {categoryName.toUpperCase()}</span>
          </div>

          {searchFiltered.length === 0 ? (
            <div className="p-3 text-center text-slate-400 font-medium">
              {slotEligibleUnits.length === 0
                ? (hasStock
                    ? "All available units in this category are assigned to other slots."
                    : `No registered stock available for ${categoryName}.`)
                : `No barcode matching "${searchTerm}".`}
            </div>
          ) : (
            searchFiltered.map((unit, uIdx) => {
              const bCode = unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
              const displayName = unit.name || categoryName;
              const isSelected = bCode === currentBarcode;

              return (
                <button
                  key={`slot-opt-${unit.id || uIdx}`}
                  type="button"
                  onClick={() => handleChoose(bCode)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-800 font-bold"
                      : "hover:bg-slate-50 text-slate-800 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {bCode}
                    </span>
                    <span className="text-slate-700 truncate max-w-[200px]">{displayName}</span>
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <CheckCircle2 size={13} /> Selected
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function VenueEquipmentChecklist({
  categoriesToRender = [],
  assignedUnitSelections = {},
  setAssignedUnitSelections,
  getAvailableUnitsForCategory,
  unitReturnedConditions = {},
  setUnitReturnedConditions,
  equipmentInspectionNotes = "",
  setEquipmentInspectionNotes,
  isHistoryView = false,
  isSideBySide = false,
  isApproved = false,
  isPreEvent = false,
  isOverrideActive = false,
  setIsOverrideActive,
  overrideCategories = [],
  setOverrideCategories,
  overrideCategory = "Wired Microphone",
  setOverrideCategory,
  overrideQuantity = 1,
  setOverrideQuantity,
  dbEquipmentTypes = [],
}) {
  const isAssignmentMode = isApproved || isPreEvent || !isSideBySide;

  const { isSuperAdmin, isStaff } = usePermissions();
  const canOverride = isSuperAdmin || isStaff;

  // Fallback to single category mode if multi array not provided
  const activeOverrideList = Array.isArray(overrideCategories) && overrideCategories.length > 0
    ? overrideCategories
    : [{ category: overrideCategory || "NONE", quantity: overrideQuantity !== undefined ? overrideQuantity : (overrideCategory === "NONE" ? 0 : 1) }];

  const handleUpdateOverrideItem = (index, field, value) => {
    if (setOverrideCategories) {
      const updated = [...activeOverrideList];
      if (field === "category") {
        if (value === "NONE") {
          updated[index] = { ...updated[index], category: "NONE", quantity: 0 };
        } else {
          const avail = getAvailableUnitsForCategory ? getAvailableUnitsForCategory(value).length : 0;
          const currentQty = updated[index]?.quantity || 1;
          const clampedQty = avail > 0 ? Math.min(Math.max(1, currentQty), avail) : 0;
          updated[index] = { ...updated[index], category: value, quantity: clampedQty };
        }
      } else if (field === "quantity") {
        const cat = updated[index]?.category;
        const typeId = updated[index]?.equipment_type_id;
        const avail = cat === "NONE" ? 0 : (getAvailableUnitsForCategory ? getAvailableUnitsForCategory(cat, typeId).length : 0);
        const clampedVal = avail > 0 ? Math.min(Math.max(1, value), avail) : 0;
        updated[index] = { ...updated[index], quantity: clampedVal };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      setOverrideCategories(updated);
    } else {
      if (field === "category") {
        const avail = value === "NONE" ? 0 : (getAvailableUnitsForCategory ? getAvailableUnitsForCategory(value).length : 0);
        if (setOverrideCategory) setOverrideCategory(value);
        if (value === "NONE" && setOverrideQuantity) setOverrideQuantity(0);
        else if (setOverrideQuantity) setOverrideQuantity(avail > 0 ? Math.min(Math.max(1, overrideQuantity || 1), avail) : 0);
      }
      if (field === "quantity") {
        const avail = overrideCategory === "NONE" ? 0 : (getAvailableUnitsForCategory ? getAvailableUnitsForCategory(overrideCategory).length : 0);
        const clampedVal = avail > 0 ? Math.min(Math.max(1, value), avail) : 0;
        if (setOverrideQuantity) setOverrideQuantity(clampedVal);
      }
    }
  };

  const handleAddOverrideCategory = () => {
    const defaultCat = dbEquipmentTypes[0]?.eq_name || dbEquipmentTypes[0]?.name || "Wired Microphone";
    const avail = getAvailableUnitsForCategory ? getAvailableUnitsForCategory(defaultCat, dbEquipmentTypes[0]?.id).length : 0;
    if (setOverrideCategories) {
      setOverrideCategories([...activeOverrideList, { category: defaultCat, quantity: avail > 0 ? 1 : 0, equipment_type_id: dbEquipmentTypes[0]?.id || null }]);
    }
  };

  const handleRemoveOverrideCategory = (index) => {
    if (setOverrideCategories && activeOverrideList.length > 1) {
      const updated = activeOverrideList.filter((_, i) => i !== index);
      setOverrideCategories(updated);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-xs">
      {!isApproved && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 gap-2 font-sans">
          <div>
            <h4 className="text-xs font-bold text-slate-900 tracking-normal flex items-center gap-2">
              <PackageOpen size={15} className="text-blue-600" />
              <span>Post Equipment Inspection</span>
            </h4>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Verify returned equipment unit condition.
            </p>
          </div>

          {!isHistoryView && !isSideBySide && canOverride && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOverrideActive && setIsOverrideActive(!isOverrideActive)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  isOverrideActive
                    ? "bg-white border-slate-900 text-slate-900 ring-1 ring-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                }`}
              >
                {isOverrideActive ? "Override Active" : "Admin Override"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin Override Controls - Multi-Category with Add/Minus Physical Units (Super Admin & Staff Only) */}
      {canOverride && (isOverrideActive || isApproved) && !isSideBySide && (
        <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 text-xs animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-extrabold text-slate-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
              <Wrench size={13} className="text-blue-600" />
              Override Controls
            </span>
            <span className="text-[10.5px] text-slate-500 font-bold">Category &amp; Qty</span>
          </div>

          <div className="space-y-2.5">
            {activeOverrideList.map((item, idx) => {
              const availableUnits = getAvailableUnitsForCategory ? getAvailableUnitsForCategory(item.category, item.equipment_type_id) : [];
              const maxAvailable = availableUnits.length;

              return (
              <div
                key={`override-row-${idx}`}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs"
              >
                {/* Category Dropdown */}
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Category {activeOverrideList.length > 1 ? `#${idx + 1}` : ""}
                  </label>
                  <select
                    value={item.category}
                    onChange={(e) => handleUpdateOverrideItem(idx, "category", e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="NONE">NONE (No Equipment Needed)</option>
                    {dbEquipmentTypes.length > 0 ? (
                      dbEquipmentTypes.map((t, tIdx) => {
                        const catVal = t.eq_name || t.name || t.eq_type || "Wired Microphone";
                        return (
                          <option key={`override-opt-${t.id || tIdx}`} value={catVal}>
                            {catVal}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="Sound System">Sound System</option>
                        <option value="Wired Microphone">Wired Microphone</option>
                        <option value="Wireless Microphone">Wireless Microphone</option>
                        <option value="Projector">Projector</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Quantity Controls (Add / Minus physical units limited by category stock) */}
                <div className="shrink-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Physical Units
                    </label>
                    {item.category !== "NONE" && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${maxAvailable > 0 ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-rose-600 bg-rose-50 border border-rose-200"}`}>
                        Max: {maxAvailable}
                      </span>
                    )}
                  </div>
                  {item.category === "NONE" || maxAvailable === 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="min-w-[4.5rem] text-center font-mono font-bold text-xs text-slate-400 bg-slate-100 py-1.5 px-2 rounded-lg border border-slate-200">
                        0 Units
                      </span>
                      {activeOverrideList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOverrideCategory(idx)}
                          className="w-8 h-8 rounded-lg border border-red-200 bg-white hover:bg-red-50 flex items-center justify-center text-red-600 cursor-pointer transition-colors ml-1 shadow-2xs"
                          title="Remove this category"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateOverrideItem(idx, "quantity", Math.max(1, (item.quantity || 1) - 1))}
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 cursor-pointer transition-colors shadow-2xs"
                        title="Decrease units (-1)"
                      >
                        <Minus size={13} />
                      </button>

                      <span className="min-w-[4.5rem] text-center font-mono font-bold text-xs text-slate-900 bg-slate-100 py-1.5 px-2 rounded-lg border border-slate-200">
                        {item.quantity || 1} {Number(item.quantity || 1) === 1 ? "Unit" : "Units"}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleUpdateOverrideItem(idx, "quantity", (item.quantity || 1) + 1)}
                        disabled={item.quantity >= maxAvailable}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 cursor-pointer transition-colors shadow-2xs"
                        title={item.quantity >= maxAvailable ? `Maximum available units reached (${maxAvailable})` : "Increase units (+1)"}
                      >
                        <Plus size={13} />
                      </button>

                      {activeOverrideList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOverrideCategory(idx)}
                          className="w-8 h-8 rounded-lg border border-red-200 bg-white hover:bg-red-50 flex items-center justify-center text-red-600 cursor-pointer transition-colors ml-1 shadow-2xs"
                          title="Remove this category"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );})}

            {/* Add More Category Dropdown Button */}
            {setOverrideCategories && (
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddOverrideCategory}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus size={13} />
                  <span>Add Equipment Category</span>
                </button>
                <span className="text-[10.5px] text-slate-400 font-medium">
                  Adjust categories and unit counts to inspect below.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Equipment Cards */}
      {categoriesToRender.length === 0 ? (
        <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-400 text-center">
          No built-in equipment or catalog items checked for this reservation.
        </div>
      ) : (
        <div className="space-y-3">
          {categoriesToRender.map((item, catIdx) => {
            const reqQty = Math.max(1, item.quantity || 1);
            const availableUnits = getAvailableUnitsForCategory ? getAvailableUnitsForCategory(item.category, item.equipment_type_id) : [];
            const hasStock = availableUnits.length > 0;

            return (
              <div key={`cat-card-${catIdx}`} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-extrabold text-slate-900 block leading-tight font-mono">{item.category}</span>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    Qty: {reqQty}
                  </span>
                </div>

                {!isAssignmentMode ? (
                  /* RETURNED UNIT CONDITION CHECKLIST (Post-event / side-by-side mode) */
                  <div className="space-y-2 pt-1">
                    {Array.from({ length: reqQty }).map((_, uIdx) => {
                      const unitKey = `${catIdx}-${uIdx}`;
                      const assignedBarcode = assignedUnitSelections[unitKey];
                      const cond = (assignedBarcode && unitReturnedConditions[assignedBarcode]) || unitReturnedConditions[unitKey] || "Good";

                      return (
                        <div key={`ret-unit-${catIdx}-${uIdx}`} className="py-2 border-b border-slate-100 last:border-b-0 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-700">Unit #{uIdx + 1}</span>
                              {assignedBarcode && (
                                <span className="font-mono text-[10.5px] text-slate-500">
                                  [{assignedBarcode}]
                                </span>
                              )}
                            </div>

                            {isHistoryView ? (
                              <span className={`text-xs font-mono font-black uppercase ${
                                cond === "Damaged" ? "text-rose-600" : (cond === "Lost" ? "text-amber-600" : "text-emerald-600")
                              }`}>
                                {cond}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions && setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Good", ...(assignedBarcode ? { [assignedBarcode]: "Good" } : {}) }))}
                                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                    cond === "Good"
                                      ? "border-slate-900 bg-white text-emerald-600 ring-1 ring-slate-900"
                                      : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
                                  }`}
                                >
                                  <span className={cond === "Good" ? "text-emerald-600" : ""}>Good</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions && setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Damaged", ...(assignedBarcode ? { [assignedBarcode]: "Damaged" } : {}) }))}
                                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                    cond === "Damaged"
                                      ? "border-slate-900 bg-white text-rose-600 ring-1 ring-slate-900"
                                      : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
                                  }`}
                                >
                                  <span className={cond === "Damaged" ? "text-rose-600" : ""}>Damaged</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions && setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Lost", ...(assignedBarcode ? { [assignedBarcode]: "Lost" } : {}) }))}
                                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                    cond === "Lost"
                                      ? "border-slate-900 bg-white text-amber-600 ring-1 ring-slate-900"
                                      : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
                                  }`}
                                >
                                  <span className={cond === "Lost" ? "text-amber-600" : ""}>Lost</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* UNIT ASSIGNMENT & PRE-EVENT INSPECTION */
                  <div className="space-y-3 pt-1">
                    {Array.from({ length: reqQty }).map((_, uIdx) => {
                      const unitKey = `${catIdx}-${uIdx}`;
                      const currentSelectedBarcode = assignedUnitSelections[unitKey] || "";
                      const cond = unitReturnedConditions[unitKey] || (currentSelectedBarcode ? unitReturnedConditions[currentSelectedBarcode] : "Good") || "Good";

                      return (
                        <div key={`unit-${catIdx}-${uIdx}`} className="py-2.5 border-b border-slate-100 last:border-b-0 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700">
                              Unit Slot #{uIdx + 1}
                            </span>
                            {currentSelectedBarcode ? (
                              <span className="text-xs font-mono font-bold text-emerald-600 flex items-center gap-1">
                                <Check size={12} className="stroke-[3]" /> Assigned [{currentSelectedBarcode}]
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-400">
                                Unassigned
                              </span>
                            )}
                          </div>

                          {isHistoryView || (isSideBySide && isPreEvent) ? (
                            <div className="font-mono text-xs text-slate-800 py-1 flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                {currentSelectedBarcode ? `Barcode: [${currentSelectedBarcode}]` : "Physical Unit Pre-Assigned"}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Pre-Inspected (Good)
                              </span>
                            </div>
                          ) : (
                            <SlotBarcodeSelector
                              unitKey={unitKey}
                              uIdx={uIdx}
                              reqQty={reqQty}
                              categoryName={item.category}
                              currentBarcode={currentSelectedBarcode}
                              availableUnits={availableUnits}
                              assignedUnitSelections={assignedUnitSelections}
                              onSelectBarcode={(newBarcode) => {
                                setAssignedUnitSelections(prev => ({
                                  ...prev,
                                  [unitKey]: newBarcode
                                }));
                              }}
                              hasStock={hasStock}
                            />
                          )}

                          {/* Pre-event physical unit condition inspection */}
                          {setUnitReturnedConditions && !isHistoryView && !isSideBySide && !isApproved && (
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10.5px] font-bold text-slate-500">Unit Condition:</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Good", ...(currentSelectedBarcode ? { [currentSelectedBarcode]: "Good" } : {}) }))}
                                  className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                    cond === "Good"
                                      ? "border-slate-900 bg-white text-emerald-600 ring-1 ring-slate-900"
                                      : "border-slate-200 bg-white text-slate-400 hover:text-slate-700"
                                  }`}
                                >
                                  Good
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Damaged", ...(currentSelectedBarcode ? { [currentSelectedBarcode]: "Damaged" } : {}) }))}
                                  className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                    cond === "Damaged"
                                      ? "border-slate-900 bg-white text-rose-600 ring-1 ring-slate-900"
                                      : "border-slate-200 bg-white text-slate-400 hover:text-slate-700"
                                  }`}
                                >
                                  Damaged
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Lost", ...(currentSelectedBarcode ? { [currentSelectedBarcode]: "Lost" } : {}) }))}
                                  className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                    cond === "Lost"
                                      ? "border-slate-900 bg-white text-amber-600 ring-1 ring-slate-900"
                                      : "border-slate-200 bg-white text-slate-400 hover:text-slate-700"
                                  }`}
                                >
                                  Lost
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Physical Unit Inspection Remarks */}
      {!isApproved && (
        <div className="space-y-1.5 pt-2 border-t border-slate-200">
          <label className="block text-[11px] font-bold text-slate-600 uppercase">
            Remarks
          </label>
          {isHistoryView || (isSideBySide && isPreEvent) ? (
            <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 min-h-[50px]">
              {isPreEvent
                ? "All physical units inspected and released in satisfactory condition before event."
                : (equipmentInspectionNotes || "All physical units inspected in satisfactory condition.")}
            </div>
          ) : (
            <textarea
              rows={2}
              placeholder="Provide additional details regarding unit condition, serial/barcode observations, or defects..."
              value={equipmentInspectionNotes || ""}
              onChange={(e) => setEquipmentInspectionNotes && setEquipmentInspectionNotes(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-400 transition-all"
            />
          )}
        </div>
      )}
    </div>
  );
}
