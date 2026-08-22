import React from "react";
import { PackageOpen, Wrench, Check } from "lucide-react";

export default function VenueEquipmentChecklist({
  categoriesToRender = [],
  assignedUnitSelections = {},
  setAssignedUnitSelections,
  getAvailableUnitsForCategory,
  unitReturnedConditions = {},
  setUnitReturnedConditions,
  isHistoryView = false,
  isSideBySide = false,
  isOverrideActive = false,
  setIsOverrideActive,
  overrideCategory = "PROJECTOR",
  setOverrideCategory,
  overrideQuantity = 3,
  setOverrideQuantity,
  dbEquipmentTypes = [],
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
        <div>
          <h4 className="text-xs font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <PackageOpen size={15} className="text-slate-600" />
            {isSideBySide ? "Equipment Catalog Checklist" : "AVR Built-in Equipment & Catalog Checklist"}
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {isSideBySide ? "Verify returned equipment unit condition." : "Check and assign physical unit barcodes for this event."}
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
            const availableUnits = getAvailableUnitsForCategory ? getAvailableUnitsForCategory(item.category) : [];
            const hasStock = availableUnits.length > 0;

            return (
              <div key={`cat-card-${catIdx}`} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-extrabold text-slate-900 block leading-tight font-mono">{item.category}</span>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    Qty: {reqQty}
                  </span>
                </div>

                {isSideBySide ? (
                  /* RETURNED UNIT CONDITION CHECKLIST (Side-by-side mode) */
                  <div className="space-y-2 pt-1">
                    {Array.from({ length: reqQty }).map((_, uIdx) => {
                      const unitKey = `${catIdx}-${uIdx}`;
                      const cond = unitReturnedConditions[unitKey] || "Good";
                      const assignedBarcode = assignedUnitSelections[unitKey];

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
                              /* Plain text status buttons with only text color for status */
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions && setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Good" }))}
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
                                  onClick={() => setUnitReturnedConditions && setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Damaged" }))}
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
                                  onClick={() => setUnitReturnedConditions && setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Lost" }))}
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
                  /* UNIT ASSIGNMENT / CHECKLIST (Full view) */
                  <div className="space-y-2 pt-1">
                    {Array.from({ length: reqQty }).map((_, uIdx) => {
                      const unitKey = `${catIdx}-${uIdx}`;
                      const currentSelectedBarcode = assignedUnitSelections[unitKey] || "";

                      return (
                        <div key={`unit-${catIdx}-${uIdx}`} className="py-2 border-b border-slate-100 last:border-b-0 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700">
                              Unit Slot #{uIdx + 1}
                            </span>
                            {currentSelectedBarcode ? (
                              <span className="text-xs font-mono font-bold text-emerald-600">
                                Assigned
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-400">
                                Unassigned
                              </span>
                            )}
                          </div>

                          {isHistoryView ? (
                            <div className="font-mono text-xs text-slate-800 py-1">
                              {currentSelectedBarcode ? `Barcode: ${currentSelectedBarcode}` : "No specific barcode logged"}
                            </div>
                          ) : (() => {
                            const otherSelectedBarcodes = Object.entries(assignedUnitSelections || {})
                              .filter(([k, v]) => k !== unitKey && Boolean(v))
                              .map(([_, v]) => String(v).trim().toUpperCase());

                            const filteredUnits = availableUnits.filter((u) => {
                              const bCode = String(u.unit_code || u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase();
                              const isCurrent = bCode === String(currentSelectedBarcode).trim().toUpperCase();
                              return isCurrent || !otherSelectedBarcodes.includes(bCode);
                            });

                            return (
                              <select
                                value={currentSelectedBarcode}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAssignedUnitSelections(prev => ({
                                    ...prev,
                                    [unitKey]: val
                                  }));
                                }}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-slate-400 cursor-pointer"
                              >
                                <option value="">
                                  -- Assign Physical Barcode (Unit {i + 1} of {item.quantity || 1}) • {filteredUnits.length} in stock --
                                </option>
                                {filteredUnits.length > 0 ? (
                                  filteredUnits.map((u, i) => {
                                    const bCode = u.unit_code || u.barcode || u.serial_number || u.code || `UNIT-${u.id}`;
                                    const uName = u.name || item.category;
                                    return (
                                      <option key={`unit-opt-${u.id || i}`} value={bCode}>
                                        {bCode} - {uName}
                                      </option>
                                    );
                                  })
                                ) : (
                                  <option value="" disabled>
                                    {hasStock ? "All available units in this category are assigned to other slots" : `No available physical stock for ${item.category}`}
                                  </option>
                                )}
                              </select>
                            );
                          })()}
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
    </div>
  );
}
