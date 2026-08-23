import { useState, useRef, useEffect } from "react";
import { Loader2, Play, Mail, CheckCircle2, PackageCheck, AlertCircle, Smartphone, ChevronDown, X, Check } from "lucide-react";
import api from "@/lib/axios";

/**
 * Typeable & Selectable Combobox for Borrow Unit Slot
 */
function BorrowSlotBarcodeSelector({
  unitKey,
  catKey,
  uIdx,
  categoryName,
  currentBarcode,
  availableUnits,
  assignedUnitSelections,
  onSelectBarcode,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(currentBarcode || "");
  const containerRef = useRef(null);

  useEffect(() => {
    setSearchTerm(currentBarcode || "");
  }, [currentBarcode]);

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
    const bCode = String(u.unit_code || u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase();
    const isCurrent = bCode === String(currentBarcode).trim().toUpperCase();
    return isCurrent || !otherSelectedBarcodes.includes(bCode);
  });

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
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={`Type barcode or choose from ${slotEligibleUnits.length} units...`}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full py-2 pl-3 pr-16 bg-white border rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none transition-all ${
            currentBarcode
              ? "border-emerald-300 ring-1 ring-emerald-200 bg-emerald-50/20"
              : "border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          }`}
        />
        <div className="absolute right-1.5 flex items-center gap-1">
          {currentBarcode && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
              title="Clear slot"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ChevronDown size={14} className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-in fade-in">
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10.5px] font-bold text-slate-500 bg-slate-50">
            <span>BARCODES FOR {String(categoryName).toUpperCase()}</span>
            <span className="font-mono text-emerald-700">{slotEligibleUnits.length} in stock</span>
          </div>

          {searchFiltered.length === 0 ? (
            <div className="p-3 text-center text-slate-400 font-medium">
              {slotEligibleUnits.length === 0
                ? `No available stock for ${categoryName}.`
                : `No barcode matching "${searchTerm}".`}
            </div>
          ) : (
            searchFiltered.map((unit, idx) => {
              const bCode = unit.unit_code || unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
              const uName = unit.name || categoryName;
              const isSelected = bCode === currentBarcode;

              return (
                <button
                  key={`borrow-opt-${unit.id || idx}`}
                  type="button"
                  onClick={() => handleChoose(bCode)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected ? "bg-emerald-50 text-emerald-800 font-bold" : "hover:bg-slate-50 text-slate-800 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {bCode}
                    </span>
                    <span className="text-slate-700 truncate max-w-[180px]">{uName}</span>
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
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
  assignedUnitSelections,
  setAssignedUnitSelections,
  isApproved,
  isPending,
  isOngoing,
  isCompleted,
  unitReturnedConditions = {},
  inspectionStatus,
  timeliness,
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

  return (
    <div className="lg:col-span-5 p-6 space-y-4">
      {/* Equipment Unit Assignments */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
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
            <div key={catIdx} className="p-3.5 bg-white rounded-2xl border border-slate-200/90 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-xs">
                    {reqCat.category}
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {availableUnits.length} in stock
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Qty: {reqCat.quantity}
                </span>
              </div>

              {/* State 1: Pending (No unit dropdown yet) */}
              {isPending && (
                <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] font-medium text-slate-500 flex items-center gap-2">
                  <PackageCheck size={14} className="text-slate-400 shrink-0" />
                  <span>Awaiting approval to assign physical barcodes.</span>
                </div>
              )}

              {/* State 2: Approved (Typeable barcode combobox) */}
              {isApproved && (
                <>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>Select Physical Barcode:</span>
                    <span className={catAssignedCount >= reqQty ? "text-emerald-600 font-extrabold" : "text-amber-600 font-extrabold"}>
                      {catAssignedCount} of {reqQty} selected
                    </span>
                  </div>

                  {availableUnits.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 text-center">
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
                            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500">
                              <span>Unit Slot #{uIdx + 1}</span>
                              {val ? (
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <Check size={11} className="stroke-[3]" /> Assigned [{val}]
                                </span>
                              ) : (
                                <span className="text-slate-400">Unassigned</span>
                              )}
                            </div>
                            <BorrowSlotBarcodeSelector
                              unitKey={idxKey}
                              catKey={catKey}
                              uIdx={uIdx}
                              categoryName={reqCat.category}
                              currentBarcode={val}
                              availableUnits={availableUnits}
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
                        const bCode = String(unit.unit_code || unit.barcode || unit.serial_number || unit.code || unit.id || "").trim().toUpperCase();
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
                              -- Assign Barcode (Unit {uIdx + 1} of {reqCat.quantity}) • {filteredUnits.length} in stock --
                            </option>
                            {filteredUnits.map((unit) => {
                              const displayCode = unit.unit_code || unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
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

                    const resolvedCond = val ? unitReturnedConditions[val] || unitReturnedConditions[idxKey] || unitReturnedConditions[catKey] : null;

                    let displayCond = resolvedCond;
                    if (!displayCond && (isOngoing || isCompleted)) {
                      if (inspectionStatus === "violation") {
                        displayCond = "Damaged";
                      } else if (timeliness === "late") {
                        displayCond = "Late Return";
                      } else {
                        displayCond = "Good";
                      }
                    }

                    return (
                      <div key={uIdx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 gap-2">
                        <span>Unit {uIdx + 1}</span>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span className={`px-2 py-0.5 rounded-lg border font-extrabold ${
                            val && val !== "—"
                              ? "bg-white border-slate-200 text-blue-700 shadow-xs"
                              : "bg-amber-100/60 border-amber-300 text-amber-800"
                          }`}>
                            {val || "Unassigned"}
                          </span>
                          
                          {(isCompleted || isOngoing) && displayCond && val && val !== "—" && (
                            <span className={`px-2 py-0.5 rounded-lg border font-extrabold shadow-xs ${
                              displayCond.toLowerCase() === 'good' || displayCond.toLowerCase() === 'clean'
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
              <span className={`text-xs font-extrabold ${allUnitsAssigned ? "text-emerald-600" : "text-amber-600"}`}>
                {allUnitsAssigned ? "Ready for Release" : "Units Pending Assignment"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleAction(selected.id, "ongoing")}
              disabled={!allUnitsAssigned || !!actionLoading}
              className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                allUnitsAssigned
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
