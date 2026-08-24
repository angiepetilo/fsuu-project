import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, Plus, ShieldCheck, FileCheck, Loader2 } from "lucide-react";
import InspectionPhotoUploader from "@/components/ui/InspectionPhotoUploader";

export default function VenuePostInspectionForm({
  inspectionStatus,
  setInspectionStatus,
  selectedViolationType,
  setSelectedViolationType,
  violationTypesList = [
    "Physical Facility / Furniture Damage",
    "Overstaying / Schedule Exceed Breach",
    "Equipment Misuse / Unauthorized Relocation",
    "Cleanliness / Waste Left Behind",
    "Noise Level / Policy Violation",
  ],
  setViolationTypesList,
  violationNotes,
  setViolationNotes,
  evidencePhoto = [],
  setEvidencePhoto,
  setFullImageModal,
  isHistoryView = false,
  handleSavePostInspection,
  savingInspection = false,
  inspectionSuccessMsg = null,
  isOngoing = false,
  isPreEvent = false,
  onSetPostInspection = null,
}) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customViolationInput, setCustomViolationInput] = useState("");

  const isBeforeInspection = isPreEvent || (isOngoing && !onSetPostInspection);

  const handleAddCustomViolation = (e) => {
    e.preventDefault();
    const trimmed = customViolationInput.trim();
    if (!trimmed) return;

    if (!violationTypesList.includes(trimmed)) {
      setViolationTypesList && setViolationTypesList([...violationTypesList, trimmed]);
    }
    setSelectedViolationType && setSelectedViolationType(trimmed);
    setCustomViolationInput("");
    setShowCustomModal(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
        <div>
          <h4 className="text-xs font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck size={16} className="text-slate-600" />
            {isBeforeInspection ? "Pre-Event Inspection Form (Before)" : "Post-Event Inspection Form (After)"}
          </h4>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
            {isHistoryView 
              ? "(Read Only History Log)"
              : isBeforeInspection
                ? "Record initial facility condition and log setup state before event starts."
                : "Record facility turnover status, verify returned equipment condition, or log damages."}
          </p>
        </div>

        {inspectionSuccessMsg && (
          <span className="text-[11px] font-mono font-bold text-emerald-600">
            {inspectionSuccessMsg}
          </span>
        )}
      </div>

      {/* Outcome Condition Selection */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-600 uppercase">
          Inspection Outcome Status *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isHistoryView}
            onClick={() => {
              if (setInspectionStatus) setInspectionStatus("clean");
              if (setViolationNotes && (!violationNotes || violationNotes.toLowerCase().includes("breach") || violationNotes.toLowerCase().includes("damage") || violationNotes.toLowerCase().includes("violation"))) {
                setViolationNotes("Satisfactory Condition (Clean Room)");
              }
            }}
            className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              inspectionStatus === "clean"
                ? "border-slate-900 bg-white text-emerald-600 ring-1 ring-slate-900"
                : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
            } ${isHistoryView ? "cursor-not-allowed opacity-80" : ""}`}
          >
            <span className={inspectionStatus === "clean" ? "text-emerald-600 font-extrabold" : "text-slate-600"}>
              Satisfactory (Clean)
            </span>
          </button>

          <button
            type="button"
            disabled={isHistoryView}
            onClick={() => {
              if (setInspectionStatus) setInspectionStatus("violation");
              if (setViolationNotes && (violationNotes === "Satisfactory Condition (Clean Room)" || violationNotes === "Satisfactory condition recorded. No policy breach notes.")) {
                setViolationNotes("");
              }
            }}
            className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              inspectionStatus === "violation"
                ? "border-slate-900 bg-white text-rose-600 ring-1 ring-slate-900"
                : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
            } ${isHistoryView ? "cursor-not-allowed opacity-80" : ""}`}
          >
            <span className={inspectionStatus === "violation" ? "text-rose-600 font-extrabold" : "text-slate-600"}>
              Policy Violation
            </span>
          </button>
        </div>
      </div>

      {/* Violation Type Section (Clean Hairline Layout) */}
      {inspectionStatus === "violation" && (
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-200 text-xs">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-slate-700">
              Violation / Breach Category *
            </label>
            {!isHistoryView && (
              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className="text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
              >
                + Add Custom
              </button>
            )}
          </div>

          {isHistoryView ? (
            <div className="font-mono text-xs font-bold text-rose-600 py-1">
              {selectedViolationType || "Policy Breach Identified"}
            </div>
          ) : (
            <select
              value={selectedViolationType || ""}
              onChange={(e) => setSelectedViolationType && setSelectedViolationType(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400 cursor-pointer"
            >
              {violationTypesList.map((vType, idx) => (
                <option key={`v-opt-${idx}`} value={vType}>
                  {vType}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Notes & Comments */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-600 uppercase">
          Inspection Notes &amp; Observations
        </label>
        {isHistoryView ? (
          <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 min-h-[60px]">
            {violationNotes || "Satisfactory condition recorded. No policy breach notes."}
          </div>
        ) : (
          <textarea
            rows={3}
            placeholder="Provide additional details regarding room condition or breach..."
            value={violationNotes || ""}
            onChange={(e) => setViolationNotes && setViolationNotes(e.target.value)}
            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-400 transition-all"
          />
        )}
      </div>

      {/* Multi-Photo Evidence & Inspection Images */}
      <InspectionPhotoUploader
        photos={evidencePhoto}
        setPhotos={setEvidencePhoto}
        isReadOnly={isHistoryView}
        onPreview={(photoUrl) => setFullImageModal && setFullImageModal(photoUrl)}
      />

      {/* Save Action Buttons */}
      {!isHistoryView && (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
          {handleSavePostInspection && (
            <button
              type="button"
              disabled={savingInspection}
              onClick={handleSavePostInspection}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
            >
              {savingInspection ? <Loader2 size={13} className="animate-spin" /> : <FileCheck size={13} />}
              <span>Save Inspection Record</span>
            </button>
          )}
        </div>
      )}

      {/* Custom Violation Type Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-3 animate-in zoom-in-95">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Add Custom Violation Category
            </h5>
            <input
              type="text"
              placeholder="e.g. Wall Paint Staining"
              value={customViolationInput}
              onChange={(e) => setCustomViolationInput(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomViolation}
                className="px-4 py-1.5 bg-white border border-slate-900 rounded-lg text-xs font-bold text-slate-900 hover:bg-slate-50 cursor-pointer"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
