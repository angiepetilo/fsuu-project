import { useState } from "react";
import { FileCheck, Loader2, CheckCircle2, AlertTriangle, HelpCircle, Camera, Clock, XCircle, CheckSquare, Square } from "lucide-react";
import InspectionPhotoUploader from "@/components/ui/InspectionPhotoUploader";

/**
 * EquipBorrowInspectionForm — Physical unit inspection checklist with missing parts spec & condition triggers.
 */
export default function EquipBorrowInspectionForm({
  isPreRelease = false,
  inspectionStatus = "clean",
  setInspectionStatus,
  timeliness = "on_time",
  setTimeliness,
  categoriesToRender = [],
  assignedUnitSelections = {},
  physicalUnits = [],
  unitReturnedConditions = {},
  setUnitReturnedConditions,
  missingPartsDetails = {},
  setMissingPartsDetails,
  violationNotes = "",
  setViolationNotes,
  evidencePhoto = [],
  setEvidencePhoto,
  onPreviewPhoto,
  savingInspection = false,
  handleSaveInspection,
  inspectionSuccessMsg,
  readOnly = false,
}) {
  // Local state for missing parts text if not passed
  const [localMissingParts, setLocalMissingParts] = useState(missingPartsDetails || {});

  const updateMissingParts = (key, text) => {
    const next = { ...localMissingParts, [key]: text };
    setLocalMissingParts(next);
    if (setMissingPartsDetails) {
      setMissingPartsDetails(next);
    }
  };

  const getUnitKey = (catIdx, uIdx, reqCat) => {
    return `${catIdx}-${uIdx}`;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!readOnly && handleSaveInspection) handleSaveInspection(e);
      }}
      className="p-4 bg-white rounded-2xl border border-slate-200/90 space-y-3.5 shadow-xs animate-in fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <FileCheck size={16} className="text-blue-600 shrink-0" />
          <h4 className="text-xs font-extrabold text-slate-900 tracking-tight">
            {isPreRelease ? "Equipment Inspection Record (Before)" : "Equipment Inspection Record (After)"}
          </h4>
          {readOnly && (
            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Read-Only Log
            </span>
          )}
        </div>
        {inspectionSuccessMsg && (
          <span className="text-[10.5px] font-mono font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={13} />
            {inspectionSuccessMsg}
          </span>
        )}
      </div>

      {/* Global Status Banner for After Inspection */}
      {!isPreRelease && (
        <div className="space-y-1.5">
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            Overall Return Outcome
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (readOnly) return;
                setTimeliness && setTimeliness("on_time");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all text-center ${
                timeliness !== "late"
                  ? "border-slate-900 bg-white text-slate-900 ring-1 ring-slate-900"
                  : "bg-white text-slate-400 border-slate-200"
              } ${readOnly ? "cursor-default" : "cursor-pointer hover:border-slate-300"}`}
            >
              Good &amp; Complete
            </button>

            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (readOnly) return;
                setTimeliness && setTimeliness(timeliness === "late" ? "on_time" : "late");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all text-center ${
                timeliness === "late"
                  ? "border-amber-600 bg-amber-50 text-amber-800 ring-1 ring-amber-600 font-black"
                  : "bg-white text-slate-400 border-slate-200"
              } ${readOnly ? "cursor-default" : "cursor-pointer hover:border-slate-300"}`}
            >
              Late Return
            </button>
          </div>
        </div>
      )}

      {/* Itemized Physical Units Checklist */}
      <div className="space-y-2.5">
        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
          Physical Unit Checklist &amp; Component Verification
        </label>

        {categoriesToRender.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No equipment items specified.</p>
        ) : (
          categoriesToRender.map((reqCat, catIdx) => {
            const reqQty = parseInt(reqCat.quantity, 10) || 1;

            return (
              <div key={catIdx} className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between font-extrabold text-xs text-slate-900 border-b border-slate-200/60 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>{reqCat.category}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    Qty: {reqCat.quantity}
                  </span>
                </div>

                {/* Per-Unit Checklist Cards */}
                <div className="space-y-2">
                  {Array.from({ length: reqQty }).map((_, uIdx) => {
                    const idxKey = getUnitKey(catIdx, uIdx, reqCat);
                    const catKey = `${reqCat.category}-${uIdx}`;
                    const val =
                      assignedUnitSelections[idxKey] ||
                      assignedUnitSelections[catKey] ||
                      assignedUnitSelections[uIdx] ||
                      "";

                    const matched = (physicalUnits || []).find((u) => {
                      const code = String(u.unit_code || u.barcode || u.serial_number || "").trim().toUpperCase();
                      const target = String(val).trim().toUpperCase();
                      return code && target && code === target;
                    });

                    const displayLabel = matched
                      ? `${matched.unit_code || matched.barcode} — ${matched.name || reqCat.category}`
                      : val
                      ? `${val} — ${reqCat.category}`
                      : `${reqCat.category} Unit ${uIdx + 1} (Unassigned)`;

                    const resolvedCode = matched?.unit_code || val || idxKey;

                    // Condition / Checklist state
                    const currentCond =
                      unitReturnedConditions[resolvedCode] ||
                      unitReturnedConditions[val] ||
                      unitReturnedConditions[idxKey] ||
                      unitReturnedConditions[catKey] ||
                      "Complete";

                    const isDamaged = String(currentCond).toLowerCase() === "damaged";
                    const isLost = String(currentCond).toLowerCase() === "lost";
                    const isComplete = !isDamaged && !isLost;

                    return (
                      <div
                        key={uIdx}
                        className={`p-2.5 bg-white rounded-xl border transition-all space-y-2 ${
                          isDamaged
                            ? "border-rose-300 bg-rose-50/20"
                            : isLost
                            ? "border-slate-800 bg-slate-50"
                            : "border-slate-200"
                        }`}
                      >
                        {/* Unit Name & Barcode */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 truncate" title={displayLabel}>
                            {displayLabel}
                          </span>

                          {/* Quick Status Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => {
                                if (readOnly) return;
                                const updated = {
                                  ...unitReturnedConditions,
                                  [idxKey]: "Complete",
                                  [catKey]: "Complete",
                                };
                                if (resolvedCode) updated[resolvedCode] = "Complete";
                                setUnitReturnedConditions(updated);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                isComplete
                                  ? "bg-emerald-600 text-white border border-emerald-700 shadow-2xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                              } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                            >
                              ✓ Complete
                            </button>

                            {!isPreRelease && (
                              <>
                                <button
                                  type="button"
                                  disabled={readOnly}
                                  onClick={() => {
                                    if (readOnly) return;
                                    const updated = {
                                      ...unitReturnedConditions,
                                      [idxKey]: "Damaged",
                                      [catKey]: "Damaged",
                                    };
                                    if (resolvedCode) updated[resolvedCode] = "Damaged";
                                    setUnitReturnedConditions(updated);
                                    setInspectionStatus && setInspectionStatus("violation");
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                    isDamaged
                                      ? "bg-rose-600 text-white border border-rose-700 shadow-2xs"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                                  } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                                >
                                  Damaged
                                </button>

                                <button
                                  type="button"
                                  disabled={readOnly}
                                  onClick={() => {
                                    if (readOnly) return;
                                    const updated = {
                                      ...unitReturnedConditions,
                                      [idxKey]: "Lost",
                                      [catKey]: "Lost",
                                    };
                                    if (resolvedCode) updated[resolvedCode] = "Lost";
                                    setUnitReturnedConditions(updated);
                                    setInspectionStatus && setInspectionStatus("lost");
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                    isLost
                                      ? "bg-slate-900 text-white border border-slate-950 shadow-2xs"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                                  } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                                >
                                  Lost
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Condition Notes */}
      <div className="space-y-1 pt-1">
        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
          {isPreRelease ? "Pre-Release Inspection Notes" : "Return Condition & Verification Notes"}
        </label>
        <textarea
          rows={2}
          disabled={readOnly}
          value={violationNotes}
          onChange={(e) => setViolationNotes && setViolationNotes(e.target.value)}
          placeholder={
            isPreRelease
              ? "Note any cosmetic wear, cable inclusions, or special accessories before release..."
              : "Enter return inspection details, component conditions, or violation remarks..."
          }
          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-50 transition-all shadow-inner disabled:bg-slate-50"
        />
      </div>

      {/* Multi-Photo Evidence & Inspection Images */}
      <InspectionPhotoUploader
        photos={evidencePhoto}
        setPhotos={setEvidencePhoto}
        isReadOnly={readOnly}
        onPreview={onPreviewPhoto}
      />

      {/* Save Button */}
      {!readOnly && (
        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={savingInspection}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-900 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
          >
            {savingInspection ? <Loader2 size={13} className="animate-spin" /> : <FileCheck size={13} />}
            <span>Save Inspection Record</span>
          </button>
        </div>
      )}
    </form>
  );
}
