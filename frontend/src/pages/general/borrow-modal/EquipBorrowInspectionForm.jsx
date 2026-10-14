import { useState, useEffect } from "react";
import { FileCheck, Loader2, CheckCircle2, AlertTriangle, HelpCircle, Camera, Clock, XCircle, CheckSquare, Square } from "lucide-react";
import InspectionPhotoUploader from "@/components/ui/InspectionPhotoUploader";
import { getOverdueMinutes, formatOverdueDuration } from "@/lib/dateTimeUtils";

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
  hasChanges = true,
  scheduledDate,
  scheduledTime,
  minutesLate = 0,
}) {
  // Local state for missing parts text if not passed
  const [localMissingParts, setLocalMissingParts] = useState(missingPartsDetails || {});

  const delayMins = minutesLate > 0 ? minutesLate : getOverdueMinutes(scheduledDate, scheduledTime);

  // Auto-suggest late timeliness on load if overdue
  useEffect(() => {
    if (!isPreRelease && delayMins > 0 && timeliness === "on_time" && setTimeliness && !readOnly) {
      setTimeliness("late");
    }
  }, [delayMins, isPreRelease]);

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

  const getBuiltInUnitsForBarcode = (barcodeVal) => {
    if (!barcodeVal || barcodeVal === "—") return [];
    const cleanBarcode = String(barcodeVal).trim().toUpperCase();

    const unit = (physicalUnits || []).find((u) => {
      const b = String(u.barcode || u.serial_number || u.code || u.id).trim().toUpperCase();
      return b === cleanBarcode;
    });

    if (!unit) return [];

    // built_in_units is stored on the physical unit (equipment_units.built_in_units).
    // Fallback to the equipment type relation if the physical unit doesn't have it set.
    let rawList = [];
    if (Array.isArray(unit.built_in_units)) {
      rawList = unit.built_in_units;
    } else if (typeof unit.built_in_units === "string") {
      try {
        rawList = JSON.parse(unit.built_in_units || "[]");
      } catch {
        rawList = [];
      }
    }

    // Fallback: check the equipment type relation (in case built-in info is on the category)
    if (!rawList.length) {
      const eqType = unit.equipmentType || unit.equipment_type;
      const typeBuiltIn = eqType?.built_in_units;
      if (Array.isArray(typeBuiltIn)) {
        rawList = typeBuiltIn;
      } else if (typeof typeBuiltIn === "string") {
        try { rawList = JSON.parse(typeBuiltIn || "[]"); } catch { rawList = []; }
      }
    }

    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    return rawList.map((biId) => {
      const match = (physicalUnits || []).find((u) =>
        String(u.id) === String(biId) ||
        String(u.barcode).trim().toUpperCase() === String(biId).trim().toUpperCase()
      );
      if (match) {
        const catName = match.equipmentType?.eq_name || match.equipment_type?.eq_name || match.category || "";
        const brand = match.brand ? String(match.brand).trim() : "";
        const model = match.model ? String(match.model).trim() : "";
        const uName = [brand, model].filter(Boolean).join(" ") || match.name || "Unit";
        const rawSeq = match.seq_no ?? match.sequence_no;
        const seqNo = rawSeq !== undefined && rawSeq !== null && String(rawSeq).trim() !== ""
          ? (String(rawSeq).trim().startsWith("#") ? String(rawSeq).trim() : `#${String(rawSeq).trim()}`)
          : null;
        return {
          id: match.id,
          barcode: match.barcode || `UNIT-${match.id}`,
          name: uName,
          category: catName,
          seq_no: seqNo,
          brand,
          model,
        };
      }

      // If not a physical unit, resolve category/accessory name (e.g. ID 8 -> HDMI)
      let resolvedTypeName = null;
      if (Array.isArray(parentUnit.equipmentType?.built_in_names) && parentUnit.equipmentType.built_in_names.length > 0) {
        const rawIdx = rawList.indexOf(biId);
        if (rawIdx !== -1 && parentUnit.equipmentType.built_in_names[rawIdx]) {
          resolvedTypeName = parentUnit.equipmentType.built_in_names[rawIdx];
        } else {
          const matchByName = parentUnit.equipmentType.built_in_names.find(
            (n) => String(n).toLowerCase() === String(biId).toLowerCase()
          );
          if (matchByName) resolvedTypeName = matchByName;
        }
      }
      if (!resolvedTypeName && Array.isArray(categoriesToRender)) {
        const catMatch = categoriesToRender.find(
          (c) => String(c.id || c.equipment_type_id) === String(biId)
        );
        if (catMatch) resolvedTypeName = catMatch.category || catMatch.name;
      }

      if (resolvedTypeName) {
        return {
          id: biId,
          barcode: resolvedTypeName,
          name: resolvedTypeName,
          category: "Built-in Accessory",
        };
      }

      return {
        id: biId,
        barcode: String(biId),
        name: isNaN(Number(biId)) ? String(biId) : `Physical Unit #${biId}`,
        category: "",
      };
    }).filter(Boolean);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!readOnly && handleSaveInspection) handleSaveInspection(e);
      }}
      className="p-4 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/90 dark:border-blue-900/50 space-y-3.5 shadow-xs animate-in fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <FileCheck size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isPreRelease ? "Equipment Inspection Record (Before)" : "Equipment Inspection Record (After)"}
          </h4>
          {readOnly && (
            <span className="text-[10px] text-slate-400 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              Read-Only Log
            </span>
          )}
        </div>
        {inspectionSuccessMsg && (
          <span className="text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={13} />
            {inspectionSuccessMsg}
          </span>
        )}
      </div>

      {/* Global Status Banner for After Inspection */}
      {!isPreRelease && (
        <div className="space-y-2">
          {delayMins > 0 && !readOnly && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span>
                <strong>Overdue Turnover:</strong> Returned <strong>{formatOverdueDuration(delayMins)}</strong> past scheduled return time.
              </span>
            </div>
          )}

          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
                  ? "border-slate-900 bg-white dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-900 dark:ring-blue-500 dark:border-blue-500"
                  : "bg-white dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
              } ${readOnly ? "cursor-default" : "cursor-pointer hover:border-slate-300 dark:hover:border-slate-700"}`}
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
                  ? "border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 ring-1 ring-amber-600 font-black"
                  : "bg-white dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
              } ${readOnly ? "cursor-default" : "cursor-pointer hover:border-slate-300 dark:hover:border-slate-700"}`}
            >
              Late Return
            </button>
          </div>
        </div>
      )}

      {/* Itemized Physical Units Checklist */}
      <div className="space-y-2.5">
        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Physical Unit Checklist &amp; Component Verification
        </label>

        {categoriesToRender.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No equipment items specified.</p>
        ) : (
          categoriesToRender.map((reqCat, catIdx) => {
            const reqQty = parseInt(reqCat.quantity, 10) || 1;

            return (
              <div key={catIdx} className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-blue-900/40 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between font-extrabold text-xs text-slate-900 dark:text-white border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>{reqCat.category}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs">
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
                      const code = String(u.barcode || u.serial_number || "").trim().toUpperCase();
                      const target = String(val).trim().toUpperCase();
                      return code && target && code === target;
                    });

                    const rawSeq = matched?.seq_no ?? matched?.sequence_no;
                    const seqNo = rawSeq !== undefined && rawSeq !== null && String(rawSeq).trim() !== ""
                      ? (String(rawSeq).trim().startsWith("#") ? String(rawSeq).trim() : `#${String(rawSeq).trim()}`)
                      : null;
                    const brand = matched?.brand ? String(matched.brand).trim() : "";
                    const model = matched?.model ? String(matched.model).trim() : "";
                    const brandModel = brand && model ? `${brand} • ${model}` : (brand || model || matched?.name || reqCat.category);

                    const resolvedCode = matched?.barcode || val || idxKey;

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
                        className={`p-2.5 rounded-xl border transition-all space-y-2 ${
                          isDamaged
                            ? "border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/30"
                            : isLost
                            ? "border-slate-800 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90"
                            : "border-slate-200 dark:border-blue-900/40 bg-white dark:bg-slate-900/80"
                        }`}
                      >
                        {/* Unit Name, Sequence Number & Barcode */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap truncate">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Unit #{uIdx + 1}</span>
                            {seqNo && (
                              <span className="font-mono text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/80 shrink-0">
                                {seqNo}
                              </span>
                            )}
                            {brandModel && (
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[200px]" title={brandModel}>
                                {brandModel}
                              </span>
                            )}
                            {(matched?.barcode || val) && (
                              <span className="font-mono text-[10.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                                {matched?.barcode || val}
                              </span>
                            )}
                          </div>

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
                                // NOTE: Do NOT auto-reset built-in units — each built-in unit
                                // has its own individual condition that must be set independently.
                                setUnitReturnedConditions(updated);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                isComplete
                                  ? "bg-emerald-600 text-white border border-emerald-700 shadow-2xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
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
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
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
                                      ? "bg-slate-900 dark:bg-slate-700 text-white border border-slate-950 dark:border-slate-600 shadow-2xs"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                                  } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                                >
                                  Lost
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Built-in physical units checklist verification */}
                        {(() => {
                          const linkedBuiltIns = getBuiltInUnitsForBarcode(val || matched?.barcode);
                          if (!linkedBuiltIns || linkedBuiltIns.length === 0) return null;

                          return (
                            <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 pl-1 sm:pl-2 space-y-1.5 animate-in fade-in">
                              <div className="flex items-center justify-between text-[10.5px] font-extrabold text-blue-950 dark:text-white">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                                  Built-in Physical Units ({linkedBuiltIns.length} Linked):
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {linkedBuiltIns.map((biUnit, biIdx) => {
                                  const biCode = biUnit.barcode;
                                  const biLabel = `[${biUnit.barcode}] ${biUnit.name} (${biUnit.category || "Built-in"})`;
                                  const biCond = unitReturnedConditions[biCode] || "Complete";
                                  const isBiDamaged = String(biCond).toLowerCase() === "damaged";
                                  const isBiLost = String(biCond).toLowerCase() === "lost";
                                  const isBiComplete = !isBiDamaged && !isBiLost;

                                  return (
                                    <div
                                      key={biIdx}
                                      className={`p-2 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                        isBiDamaged
                                          ? "border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/40"
                                          : isBiLost
                                          ? "border-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-900"
                                          : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                        {biUnit.seq_no && (
                                          <span className="font-mono text-[9.5px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-800/80 shrink-0">
                                            {biUnit.seq_no}
                                          </span>
                                        )}
                                        <span className="font-mono text-[10.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                                          {biUnit.barcode}
                                        </span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={biLabel}>
                                          {biUnit.name}
                                          {biUnit.category && (
                                            <span className="text-slate-500 dark:text-slate-400 font-medium text-[10.5px] ml-1">
                                              ({biUnit.category})
                                            </span>
                                          )}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0 justify-end">
                                        <button
                                          type="button"
                                          disabled={readOnly}
                                          onClick={() => {
                                            if (readOnly) return;
                                            const updated = {
                                              ...unitReturnedConditions,
                                              [biCode]: "Complete",
                                            };
                                            setUnitReturnedConditions(updated);
                                          }}
                                          className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase transition-all ${
                                            isBiComplete
                                              ? "bg-emerald-600 text-white border border-emerald-700 shadow-2xs"
                                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
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
                                                  [biCode]: "Damaged",
                                                };
                                                setUnitReturnedConditions(updated);
                                                setInspectionStatus && setInspectionStatus("violation");
                                              }}
                                              className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase transition-all ${
                                                isBiDamaged
                                                  ? "bg-rose-600 text-white border border-rose-700 shadow-2xs"
                                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
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
                                                  [biCode]: "Lost",
                                                };
                                                setUnitReturnedConditions(updated);
                                                setInspectionStatus && setInspectionStatus("lost");
                                              }}
                                              className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase transition-all ${
                                                isBiLost
                                                  ? "bg-slate-900 dark:bg-slate-700 text-white border border-slate-950 dark:border-slate-600 shadow-2xs"
                                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                                              } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                                            >
                                              Lost
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Remarks */}
      <div className="space-y-1 pt-1">
        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Remarks
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
          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-blue-900/50 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-50 dark:focus:ring-blue-950/50 transition-all shadow-inner disabled:bg-slate-50 dark:disabled:bg-slate-800"
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
      {!readOnly && hasChanges && (
        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={savingInspection}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-[0.98] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {savingInspection ? <Loader2 size={13} className="animate-spin" /> : <FileCheck size={13} />}
            <span>Save Inspection Record</span>
          </button>
        </div>
      )}
    </form>
  );
}
