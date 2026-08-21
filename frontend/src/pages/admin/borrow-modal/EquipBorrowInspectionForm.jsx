import { FileCheck, Loader2 } from "lucide-react";

/**
 * EquipBorrowInspectionForm — Equipment post-use inspection record form.
 */
export default function EquipBorrowInspectionForm({
  inspectionStatus,
  setInspectionStatus,
  timeliness,
  setTimeliness,
  categoriesToRender,
  assignedUnitSelections,
  physicalUnits,
  unitReturnedConditions,
  setUnitReturnedConditions,
  violationNotes,
  setViolationNotes,
  savingInspection,
  handleSaveInspection,
  inspectionSuccessMsg,
  readOnly = false,
  isPreRelease = false,
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!readOnly && handleSaveInspection) handleSaveInspection(e); }} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <FileCheck size={14} className="text-slate-600" />
          {isPreRelease ? "Equipment Inspection Record (Before)" : "Equipment Inspection Record (After)"} {readOnly && <span className="text-[10px] text-slate-400 font-mono">(Read Only History Log)</span>}
        </h4>
        {inspectionSuccessMsg && (
          <span className="text-[10px] font-mono font-bold text-emerald-600">
            {inspectionSuccessMsg}
          </span>
        )}
      </div>

      <div className="space-y-2.5 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">{isPreRelease ? "Dispatch Condition *" : "Returned Condition *"}</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && setInspectionStatus("clean")}
              className={`p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                inspectionStatus === "clean"
                  ? "border-slate-900 bg-white text-emerald-600 ring-1 ring-slate-900"
                  : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
              } ${readOnly ? "cursor-default opacity-90" : ""}`}
            >
              <span className={inspectionStatus === "clean" ? "text-emerald-600 font-extrabold" : "text-slate-500"}>
                ● Good Condition
              </span>
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && setInspectionStatus("violation")}
              className={`p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                inspectionStatus === "violation"
                  ? "border-slate-900 bg-white text-rose-600 ring-1 ring-slate-900"
                  : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
              } ${readOnly ? "cursor-default opacity-90" : ""}`}
            >
              <span className={inspectionStatus === "violation" ? "text-rose-600 font-extrabold" : "text-slate-500"}>
                ● Damaged / Lost
              </span>
            </button>
          </div>
        </div>

        {inspectionStatus === "violation" && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="block text-[11px] font-bold text-slate-700 uppercase">
              Damaged / Lost Items Specification *
            </label>
            <div className="space-y-2">
              {categoriesToRender.map((reqCat, catIdx) => (
                <div key={catIdx} className="p-2 bg-slate-50 border border-slate-200/90 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between font-extrabold text-[11px] text-slate-800">
                    <span>{reqCat.category}</span>
                    <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      Qty: {reqCat.quantity}
                    </span>
                  </div>
                  {Array.from({ length: reqCat.quantity }).map((_, uIdx) => {
                    const idxKey = `${catIdx}-${uIdx}`;
                    const catKey = `${reqCat.category}-${uIdx}`;
                    const val =
                      assignedUnitSelections[idxKey] ||
                      assignedUnitSelections[catKey] ||
                      "";

                    const matched = (physicalUnits || []).find(u => {
                      const code = String(u.unit_code || "").trim();
                      const name = String(u.name || "").trim();
                      const id = String(u.id || "").trim();
                      const target = String(val).trim();
                      return (code && code === target) || (name && name === target) || (id && id === target);
                    });

                    const displayLabel = matched
                      ? `${matched.unit_code || matched.barcode || matched.id} — ${matched.name || reqCat.category}`
                      : (val || `${reqCat.category} Unit ${uIdx + 1}`);

                    const resolvedCode = matched?.unit_code || val;
                    const currentCond =
                      (resolvedCode && unitReturnedConditions[resolvedCode]) ||
                      (val && unitReturnedConditions[val]) ||
                      (matched?.name && unitReturnedConditions[matched.name]) ||
                      unitReturnedConditions[idxKey] ||
                      unitReturnedConditions[catKey] ||
                      "Damaged";

                    return (
                      <div key={uIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        <span className="font-mono text-[11px] font-bold text-slate-800 truncate max-w-[200px]" title={displayLabel}>
                          {displayLabel}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {["Good", "Damaged", "Lost"].map((cOption) => {
                            const isSelected = String(currentCond).toLowerCase() === cOption.toLowerCase();
                            return (
                              <button
                                key={cOption}
                                type="button"
                                disabled={readOnly}
                                onClick={() => {
                                  if (readOnly) return;
                                  const updated = {
                                    ...unitReturnedConditions,
                                    [idxKey]: cOption,
                                    [catKey]: cOption,
                                  };
                                  if (resolvedCode) {
                                    updated[resolvedCode] = cOption;
                                  }
                                  setUnitReturnedConditions(updated);
                                }}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                                  isSelected
                                    ? cOption === "Good"
                                      ? "bg-emerald-600 text-white border border-emerald-700 shadow-xs"
                                      : cOption === "Damaged"
                                      ? "bg-rose-600 text-white border border-rose-700 shadow-xs"
                                      : "bg-slate-900 text-white border border-slate-950 shadow-xs"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                } ${readOnly ? "cursor-default opacity-90" : "cursor-pointer"}`}
                              >
                                {cOption}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isPreRelease && (
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Return Timeliness *</label>
            <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && setTimeliness("on_time")}
              className={`p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                timeliness === "on_time"
                  ? "border-slate-900 bg-white text-emerald-600 ring-1 ring-slate-900"
                  : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
              } ${readOnly ? "cursor-default opacity-90" : ""}`}
            >
              <span className={timeliness === "on_time" ? "text-emerald-600 font-extrabold" : "text-slate-500"}>
                ✓ On Time
              </span>
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && setTimeliness("late")}
              className={`p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                timeliness === "late"
                  ? "border-slate-900 bg-white text-amber-600 ring-1 ring-slate-900"
                  : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
              } ${readOnly ? "cursor-default opacity-90" : ""}`}
            >
              <span className={timeliness === "late" ? "text-amber-600 font-extrabold" : "text-slate-500"}>
                ⚠ Late Return
              </span>
            </button>
          </div>
        </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Condition Notes</label>
          <textarea
            rows={2}
            readOnly={readOnly}
            placeholder="Enter inspection condition details..."
            value={violationNotes}
            onChange={(e) => !readOnly && setViolationNotes(e.target.value)}
            className={`w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400 ${readOnly ? "bg-slate-50 text-slate-700 cursor-default" : ""}`}
          />
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end pt-1 border-t border-slate-100">
          <button
            type="submit"
            disabled={savingInspection}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {savingInspection ? <Loader2 size={13} className="animate-spin" /> : <FileCheck size={13} />}
            Save Record
          </button>
        </div>
      )}
    </form>
  );
}
