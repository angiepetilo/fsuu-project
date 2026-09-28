import { useState, useRef, useEffect } from "react";
import { Loader2, Play, Mail, CheckCircle2, PackageCheck, AlertCircle, Smartphone, ChevronDown, X, Check } from "lucide-react";
import api from "@/lib/axios";

/**
 * Typeable & Selectable Combobox for Borrow Unit Slot (Model Selection + Built-in components)
 */
function BorrowSlotBarcodeSelector({
  unitKey,
  catKey,
  uIdx,
  categoryName,
  currentBarcode,
  availableUnits,
  allUnits = [],
  assignedUnitSelections,
  onSelectBarcode,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  const getUnitModelName = (unit) => {
    return [unit.brand, unit.model].filter(Boolean).join(" ") || unit.name || categoryName || "Equipment Unit";
  };

  const getUnitBuiltIns = (unit) => {
    const rawList = Array.isArray(unit.built_in_units)
      ? unit.built_in_units
      : (typeof unit.built_in_units === "string" ? JSON.parse(unit.built_in_units || "[]") : []);
    if (!Array.isArray(rawList) || rawList.length === 0) return [];
    return rawList.map((biId) => {
      const match = (allUnits || []).find((u) =>
        String(u.id) === String(biId) ||
        String(u.barcode || "").trim().toUpperCase() === String(biId).trim().toUpperCase()
      );
      return match ? (match.name || [match.brand, match.model].filter(Boolean).join(" ") || match.barcode || `Unit #${biId}`) : `Unit #${biId}`;
    });
  };

  const selectedUnit = (availableUnits || []).find(
    (u) => String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase() === String(currentBarcode).trim().toUpperCase()
  );

  useEffect(() => {
    if (selectedUnit) {
      setSearchTerm(`${getUnitModelName(selectedUnit)} [${selectedUnit.barcode || `UNIT-${selectedUnit.id}`}]`);
    } else {
      setSearchTerm(currentBarcode || "");
    }
  }, [currentBarcode, selectedUnit]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const otherSelectedBarcodes = Object.entries(assignedUnitSelections || {})
    .filter(([k, v]) => k !== unitKey && k !== catKey && Boolean(v))
    .map(([_, v]) => String(v).trim().toUpperCase());

  const slotEligibleUnits = availableUnits.filter((u) => {
    const bCode = String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase();
    const isCurrent = bCode === String(currentBarcode).trim().toUpperCase();
    return isCurrent || !otherSelectedBarcodes.includes(bCode);
  });

  const searchFiltered = slotEligibleUnits.filter((u) => {
    const bCode = String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).toLowerCase();
    const uModel = getUnitModelName(u).toLowerCase();
    const uBuiltIns = getUnitBuiltIns(u).join(" ").toLowerCase();
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return bCode.includes(q) || uModel.includes(q) || uBuiltIns.includes(q);
  });

  const handleChoose = (unit) => {
    const bCode = unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
    onSelectBarcode(bCode);
    setSearchTerm(`${getUnitModelName(unit)} [${bCode}]`);
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
    const exactMatch = slotEligibleUnits.find((u) => {
      const bCode = String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase();
      return bCode === val.trim().toUpperCase() || getUnitModelName(u).toLowerCase() === val.trim().toLowerCase();
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
        handleChoose(searchFiltered[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={currentBarcode ? "Change unit model..." : "Select model or type barcode..."}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full py-2.5 pl-3 pr-16 bg-white dark:bg-slate-900/80 border rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all ${
            currentBarcode
              ? "border-emerald-300 dark:border-emerald-700/80 ring-1 ring-emerald-200 dark:ring-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/20"
              : "border-slate-200 dark:border-blue-900/50 focus:border-blue-400 dark:focus:border-blue-600 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-900/40"
          }`}
        />
        <div className="absolute right-1.5 flex items-center gap-1">
          {currentBarcode && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Clear slot"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronDown size={14} className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-blue-900/50 rounded-xl shadow-xl py-1 text-xs animate-in fade-in">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10.5px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/80">
            <span>AVAILABLE MODELS FOR {String(categoryName).toUpperCase()}</span>
            <span>{searchFiltered.length} Available</span>
          </div>

          {searchFiltered.length === 0 ? (
            <div className="p-3 text-center text-slate-400 dark:text-slate-500 font-medium">
              {slotEligibleUnits.length === 0
                ? `No available stock for ${categoryName}.`
                : `No unit model matching "${searchTerm}".`}
            </div>
          ) : (
            searchFiltered.map((unit, idx) => {
              const bCode = unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
              const uModel = getUnitModelName(unit);
              const builtIns = getUnitBuiltIns(unit);
              const isSelected = bCode === currentBarcode;

              return (
                <button
                  key={`borrow-opt-${unit.id || idx}`}
                  type="button"
                  onClick={() => handleChoose(unit)}
                  className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800/60 last:border-0 ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-semibold"
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate max-w-[220px]">
                        {uModel}
                      </span>
                      <span className="font-mono text-[10.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        {bCode}
                      </span>
                    </div>
                    {builtIns.length > 0 && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="font-bold text-blue-600 dark:text-blue-400">Built-in:</span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                          {builtIns.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Check size={12} className="stroke-[3]" /> Selected
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

/**
 * EquipBorrowUnitAssignment — Right column component for assigning unit barcodes and workflow actions.
 */
export default function EquipBorrowUnitAssignment({
  selected,
  categoriesToRender,
  getAvailableUnitsForCategory,
  allUnits = [],
  assignedUnitSelections,
  setAssignedUnitSelections,
  isApproved,
  isPending,
  isOngoing,
  isCompleted,
  unitReturnedConditions = {},
  inspectionStatus,
  timeliness,
  compromisedUnitKeys,
  handleAction,
  actionLoading,
  resendMsg,
  resendLoading,
  handleResendEmail,
  smsMsg,
  smsLoading,
  handleSendOverdueSms,
}) {
  const borrowingOfficeId = selected?.office_id || selected?.office?.id || (selected?.items && selected.items[0]?.equipment_type?.office_id);

  const getBuiltInUnitsForBarcode = (barcodeVal) => {
    if (!barcodeVal || barcodeVal === "—") return [];
    const cleanBarcode = String(barcodeVal).trim().toUpperCase();

    const unit = (allUnits || []).find((u) => {
      const b = String(u.barcode || u.serial_number || u.code || u.id).trim().toUpperCase();
      return b === cleanBarcode;
    });

    if (!unit) return [];

    const rawList = Array.isArray(unit.built_in_units)
      ? unit.built_in_units
      : (typeof unit.built_in_units === "string" ? JSON.parse(unit.built_in_units || "[]") : []);

    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    return rawList.map((biId) => {
      const match = (allUnits || []).find((u) =>
        String(u.id) === String(biId) ||
        String(u.barcode).trim().toUpperCase() === String(biId).trim().toUpperCase()
      );
      if (match) {
        const catName = match.equipmentType?.eq_name || match.equipment_type?.eq_name || match.category || "";
        const uName = match.name || [match.brand, match.model].filter(Boolean).join(" ") || "Unit";
        return {
          id: match.id,
          barcode: match.barcode || `UNIT-${match.id}`,
          name: uName,
          category: catName,
        };
      }
      return {
        id: biId,
        barcode: String(biId),
        name: `Physical Unit #${biId}`,
        category: "",
      };
    }).filter(Boolean);
  };

  // Check if all requested units have been assigned
  let totalRequestedUnits = 0;
  let totalAssignedUnits = 0;

  categoriesToRender.forEach((catObj, catIdx) => {
    const reqQty = parseInt(catObj.quantity, 10) || 1;
    totalRequestedUnits += reqQty;
    for (let uIdx = 0; uIdx < reqQty; uIdx++) {
      const idxKey = `${catIdx}-${uIdx}`;
      const catKey = `${catObj.category}-${uIdx}`;
      if (assignedUnitSelections[idxKey] || assignedUnitSelections[catKey]) {
        totalAssignedUnits++;
      }
    }
  });

  const allUnitsAssigned = totalRequestedUnits > 0 && totalAssignedUnits >= totalRequestedUnits;

  const hasCompromisedUnits = Object.values(assignedUnitSelections || {}).some((bCode) => {
    if (!bCode || bCode === "—") return false;
    const cleanCode = String(bCode).trim().toUpperCase();
    return Boolean(compromisedUnitKeys && compromisedUnitKeys.has(cleanCode));
  });

  const canRelease = allUnitsAssigned && !hasCompromisedUnits;

  return (
    <div className="lg:col-span-5 p-6 space-y-4">
      {/* Equipment Unit Assignments */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono uppercase tracking-wider block font-bold ${
            isCompleted ? "text-emerald-600" : "text-slate-500"
          }`}>
            {isPending ? "REQUESTED EQUIPMENT" : "EQUIPMENT UNIT ASSIGNMENT"}
          </span>
          {isApproved && (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              allUnitsAssigned
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {totalAssignedUnits} of {totalRequestedUnits} units selected
            </span>
          )}
          {isCompleted && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              ✓ Completed
            </span>
          )}
        </div>

        {categoriesToRender.map((reqCat, catIdx) => {
          const availableUnits = getAvailableUnitsForCategory(reqCat.category, reqCat.equipment_type_id);

          // Count assigned for this category
          const reqQty = parseInt(reqCat.quantity, 10) || 1;
          let catAssignedCount = 0;
          for (let u = 0; u < reqQty; u++) {
            const k1 = `${catIdx}-${u}`;
            const k2 = `${reqCat.category}-${u}`;
            if (assignedUnitSelections[k1] || assignedUnitSelections[k2]) catAssignedCount++;
          }

          return (
            <div key={catIdx} className="p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/90 dark:border-blue-900/50 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {reqCat.category}
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  Qty: {reqCat.quantity}
                </span>
              </div>

              {/* State 1: Pending (No unit dropdown yet) */}
              {isPending && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 rounded-xl text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <PackageCheck size={14} className="text-slate-400 shrink-0" />
                  <span>Awaiting approval to assign physical unit models.</span>
                </div>
              )}

              {/* State 2: Approved (Typeable model combobox) */}
              {isApproved && (
                <>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <span>Select Equipment Unit / Model:</span>
                    <span className={catAssignedCount >= reqQty ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-amber-600 dark:text-amber-400 font-extrabold"}>
                      {catAssignedCount} of {reqQty} selected
                    </span>
                  </div>

                  {availableUnits.length === 0 ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 text-center">
                      No available units in stock for {reqCat.category}.
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {Array.from({ length: reqCat.quantity }).map((_, uIdx) => {
                        const idxKey = `${catIdx}-${uIdx}`;
                        const catKey = `${reqCat.category}-${uIdx}`;
                        const val =
                          assignedUnitSelections[idxKey] ||
                          assignedUnitSelections[catKey] ||
                          "";

                        return (
                          <div key={uIdx} className="relative space-y-1">
                            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                              <span>Unit Slot #{uIdx + 1}</span>
                              {val ? (() => {
                                const match = (allUnits || []).find(u => String(u.barcode || u.id).trim().toUpperCase() === String(val).trim().toUpperCase());
                                const modelName = match ? ([match.brand, match.model].filter(Boolean).join(" ") || match.name) : "";
                                return (
                                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                                    <Check size={11} className="stroke-[3]" /> {modelName ? `${modelName} [${val}]` : `Assigned [${val}]`}
                                  </span>
                                );
                              })() : (
                                <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
                              )}
                            </div>
                            <BorrowSlotBarcodeSelector
                              unitKey={idxKey}
                              catKey={catKey}
                              uIdx={uIdx}
                              categoryName={reqCat.category}
                              currentBarcode={val}
                              availableUnits={availableUnits}
                              allUnits={allUnits}
                              assignedUnitSelections={assignedUnitSelections}
                              onSelectBarcode={(newBarcode) => {
                                const updated = { ...assignedUnitSelections, [idxKey]: newBarcode };
                                if (catKey !== idxKey && catKey in updated) delete updated[catKey];
                                setAssignedUnitSelections(updated);
                                if (selected && selected.id) {
                                  localStorage.setItem(`fsuu_assigned_units_eb_${selected.id}`, JSON.stringify(updated));
                                  api.put(`/avr-equipment-borrowings/${selected.id}/assign-units`, { assigned_units: updated }).catch(() => {});
                                }
                              }}
                            />

                            {/* Built-in physical units linked to selected physical unit */}
                            {val && (() => {
                              const slotBuiltIns = getBuiltInUnitsForBarcode(val);
                              if (!slotBuiltIns || slotBuiltIns.length === 0) return null;
                              return (
                                <div className="mt-1.5 p-2.5 rounded-xl bg-blue-50/70 dark:bg-slate-900/80 border border-blue-200/80 dark:border-blue-900/50 space-y-1.5 animate-in fade-in">
                                  <div className="flex items-center justify-between text-[11px] font-extrabold text-blue-950 dark:text-white">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></span>
                                      Built-in to [{val}]
                                    </span>
                                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full shadow-2xs">
                                      {slotBuiltIns.length} {slotBuiltIns.length === 1 ? "Unit" : "Units"} Linked
                                    </span>
                                  </div>
                                  <div className="flex flex-col gap-1 pt-0.5">
                                    {slotBuiltIns.map((biUnit, biIdx) => (
                                      <div
                                        key={biIdx}
                                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/50 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-[11px]">
                                            {biUnit.barcode}
                                          </span>
                                          <span className="text-slate-800 dark:text-slate-200 font-bold">{biUnit.name}</span>
                                        </div>
                                        {biUnit.category && (
                                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                            {biUnit.category}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* State 3 & 4: Released (On-Going) or Completed */}
              {(isOngoing || isCompleted) && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10.5px] font-mono text-slate-400 font-bold uppercase">
                    Dispatched Physical Units:
                  </span>
                  {Array.from({ length: reqCat.quantity }).map((_, uIdx) => {
                    const idxKey = `${catIdx}-${uIdx}`;
                    const catKey = `${reqCat.category}-${uIdx}`;
                    const val = assignedUnitSelections[idxKey] || assignedUnitSelections[catKey] || "";

                    if (isOngoing && (!val || val === "—")) {
                      const otherSelectedBarcodes = Object.entries(assignedUnitSelections || {})
                        .filter(([k, v]) => k !== idxKey && k !== catKey && k !== String(uIdx) && Boolean(v))
                        .map(([_, v]) => String(v).trim().toUpperCase());

                      const filteredUnits = availableUnits.filter((unit) => {
                        const bCode = String(unit.barcode || unit.serial_number || unit.code || unit.id || "").trim().toUpperCase();
                        const uName = String(unit.name || "").trim().toUpperCase();
                        return !otherSelectedBarcodes.includes(bCode) && (!uName || !otherSelectedBarcodes.includes(uName));
                      });

                      return (
                        <div key={uIdx} className="relative">
                          <select
                            value={val}
                            onChange={(e) => {
                              const updated = { ...assignedUnitSelections, [idxKey]: e.target.value };
                              if (catKey !== idxKey && catKey in updated) {
                                delete updated[catKey];
                              }
                              setAssignedUnitSelections(updated);
                              if (selected && selected.id) {
                                localStorage.setItem(`fsuu_assigned_units_eb_${selected.id}`, JSON.stringify(updated));
                                api.put(`/avr-equipment-borrowings/${selected.id}/assign-units`, { assigned_units: updated }).catch(() => {});
                              }
                            }}
                            className="w-full p-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-50 cursor-pointer"
                          >
                            <option value="">
                              -- Assign Barcode (Unit {uIdx + 1} of {reqCat.quantity}) --
                            </option>
                            {filteredUnits.map((unit) => {
                              const displayCode = unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
                              return (
                                <option key={unit.id} value={displayCode}>
                                  {displayCode} — {unit.name || reqCat.category}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    }

                    // Condition badge should ONLY be shown when the borrowing is COMPLETED.
                    // For ONGOING / APPROVED: equipment is currently out with borrower, so never show Lost/Damaged badge.
                    const resolvedCond = (isCompleted && val)
                      ? unitReturnedConditions[val] || unitReturnedConditions[idxKey] || unitReturnedConditions[catKey]
                      : null;

                    let displayCond = null;
                    if (isCompleted) {
                      if (resolvedCond) {
                        displayCond = resolvedCond;
                      } else {
                        displayCond = "Complete";
                      }
                    }

                    const slotBuiltIns = getBuiltInUnitsForBarcode(val);

                    return (
                      <div key={uIdx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono font-bold text-slate-800 gap-2">
                          <span>Unit {uIdx + 1}</span>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <span className={`px-2 py-0.5 rounded-lg border font-extrabold ${
                              val && val !== "—"
                                ? "bg-white border-slate-200 text-blue-700 shadow-xs"
                                : "bg-amber-100/60 border-amber-300 text-amber-800"
                            }`}>
                              {val || "Unassigned"}
                            </span>

                            {displayCond && val && val !== "—" && (
                              <span className={`px-2 py-0.5 rounded-lg border font-extrabold shadow-xs ${
                                ['good', 'clean', 'complete'].includes(displayCond.toLowerCase())
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : displayCond.toLowerCase() === 'late return' || displayCond.toLowerCase() === 'late'
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}>
                                {displayCond}
                              </span>
                            )}
                          </div>
                        </div>

                        {slotBuiltIns.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Built-in Linked Units ({slotBuiltIns.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {slotBuiltIns.map((biUnit, biIdx) => {
                                const biCond = (isCompleted && biUnit.barcode) ? (unitReturnedConditions[biUnit.barcode] || "Complete") : null;
                                const isBiLost = biCond && biCond.toLowerCase() === "lost";
                                const isBiDamaged = biCond && biCond.toLowerCase() === "damaged";
                                return (
                                  <span
                                    key={biIdx}
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium shadow-2xs ${
                                      isBiLost
                                        ? "bg-rose-100 text-rose-900 border-rose-300 font-bold"
                                        : isBiDamaged
                                        ? "bg-rose-50 text-rose-700 border-rose-200 font-bold"
                                        : "bg-white border-slate-200 text-slate-700"
                                    }`}
                                  >
                                    <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-100 text-[10px]">
                                      {biUnit.barcode}
                                    </span>
                                    <span>{biUnit.name}</span>
                                    {biCond && biCond.toLowerCase() !== "complete" && biCond.toLowerCase() !== "good" && (
                                      <span className={`text-[10px] uppercase font-black px-1.5 py-0.2 rounded ${isBiLost ? "bg-rose-900 text-white" : "bg-rose-600 text-white"}`}>
                                        {biCond}
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
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

      {/* Workflow Actions Section */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        {isApproved && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 font-bold">Fulfillment:</span>
              <span className={`text-xs font-extrabold ${
                hasCompromisedUnits
                  ? "text-rose-600"
                  : allUnitsAssigned
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}>
                {hasCompromisedUnits
                  ? "Unit / Built-in Damaged or Lost"
                  : allUnitsAssigned
                  ? "Ready for Release"
                  : "Units Pending Assignment"}
              </span>
            </div>
            {hasCompromisedUnits && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-semibold text-rose-800 flex items-start gap-2">
                <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                <span>One or more assigned units or linked built-in components are damaged or lost. The equipment cannot be released until the damaged component or unit is replaced.</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => handleAction(selected.id, "ongoing")}
              disabled={!canRelease || !!actionLoading}
              className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                canRelease
                  ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                  : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
              }`}
            >
              {actionLoading === `${selected.id}-ongoing` ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Release Equipment (Mark On-Going)
            </button>
          </div>
        )}

        {isOngoing && (
          <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center gap-2 text-xs font-bold text-blue-800">
            <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
            <span>Equipment dispatched. Awaiting return & post-use inspection.</span>
          </div>
        )}
      </div>
    </div>
  );
}
