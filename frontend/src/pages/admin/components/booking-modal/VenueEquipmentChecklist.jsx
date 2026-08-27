import React, { useState, useRef, useEffect } from "react";
import { PackageOpen, Wrench, Check, Search, ChevronDown, X, CheckCircle2 } from "lucide-react";

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
    const bCode = String(u.unit_code || u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase();
    const isCurrent = bCode === String(currentBarcode).trim().toUpperCase();
    return isCurrent || !otherSelectedBarcodes.includes(bCode);
  });

  // Search filtered options
  const searchFiltered = slotEligibleUnits.filter((u) => {
    const bCode = String(u.unit_code || u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).toLowerCase();
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
      const bCode = String(u.unit_code || u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase();
      return bCode === val.trim().toUpperCase();
    });

    if (exactMatch) {
      const exactCode = exactMatch.unit_code || exactMatch.barcode || exactMatch.serial_number || exactMatch.code || `UNIT-${exactMatch.id}`;
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
        const topCode = top.unit_code || top.barcode || top.serial_number || top.code || `UNIT-${top.id}`;
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
            searchFiltered.map((unit, idx) => {
              const bCode = unit.unit_code || unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
              const uName = unit.name || categoryName;
              const isSelected = bCode === currentBarcode;

              return (
                <button
                  key={`slot-opt-${unit.id || idx}`}
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
                    <span className="text-slate-700 truncate max-w-[200px]">{uName}</span>
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
  overrideCategory = "PROJECTOR",
  setOverrideCategory,
  overrideQuantity = 3,
  setOverrideQuantity,
  dbEquipmentTypes = [],
}) {
  const isAssignmentMode = isApproved || isPreEvent || !isSideBySide;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 gap-2 font-sans">
        <div>
          <h4 className="text-xs font-bold text-slate-900 tracking-normal flex items-center gap-2">
            <PackageOpen size={15} className="text-blue-600" />
            <span>Post Equipment Inspection</span>
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Verify returned equipment unit condition.
          </p>
        </div>

        {!isHistoryView && !isSideBySide && (
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

      {/* Admin Override Controls */}
      {isOverrideActive && !isSideBySide && (
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
              <Wrench size={13} className="text-slate-600" />
              Override Controls
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Category &amp; Qty</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
              <select
                value={overrideCategory}
                onChange={(e) => setOverrideCategory && setOverrideCategory(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="NONE">NONE (No Equipment Needed)</option>
                {dbEquipmentTypes.length > 0 ? (
                  dbEquipmentTypes.map((t, idx) => {
                    const catVal = t.eq_name || t.name || t.eq_type || "PROJECTOR";
                    return <option key={`override-opt-${t.id || idx}`} value={catVal}>{catVal}</option>;
                  })
                ) : (
                  <>
                    <option value="PROJECTOR">PROJECTOR</option>
                    <option value="CAMERA">CAMERA</option>
                    <option value="PROJECTOR SCREEN">PROJECTOR SCREEN</option>
                    <option value="WIRELESS MICROPHONE">WIRELESS MICROPHONE</option>
                  </>
                )}
              </select>
            </div>
            {overrideCategory !== "NONE" && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity</label>
                <select
                  value={overrideQuantity}
                  onChange={(e) => setOverrideQuantity && setOverrideQuantity(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={`num-${num}`} value={num}>{num} Unit{num !== 1 ? "s" : ""}</option>
                  ))}
                </select>
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
                          {setUnitReturnedConditions && !isHistoryView && !isSideBySide && (
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

      {/* Physical Unit Inspection Notes & Observations */}
      <div className="space-y-1.5 pt-2 border-t border-slate-200">
        <label className="block text-[11px] font-bold text-slate-600 uppercase">
          Inspection Notes &amp; Observations
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
    </div>
  );
}
