import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, FileCheck, Loader2 } from "lucide-react";
import InspectionPhotoUploader from "@/components/ui/InspectionPhotoUploader";
import { getOverdueMinutes, formatOverdueDuration } from "@/lib/dateTimeUtils";

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
  scheduledDate,
  scheduledTime,
  minutesLate = 0,
}) {
  const [hoverRemarks, setHoverRemarks] = useState("");

  const delayMins = minutesLate > 0 ? minutesLate : getOverdueMinutes(scheduledDate, scheduledTime);

  useEffect(() => {
    if (delayMins > 0 && setSelectedViolationType && !selectedViolationType && !isHistoryView) {
      setSelectedViolationType("Overstaying / Schedule Exceed Breach");
    }
  }, [delayMins]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-xs font-sans">
      {/* Header with Clean Typography */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
        <div>
          <h4 className="text-xs font-bold text-slate-900 tracking-normal flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-600" />
            <span>Post Venue Inspection</span>
          </h4>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
            {isHistoryView ? "(Read Only History Log)" : "Verify venue condition."}
          </p>
        </div>

        {inspectionSuccessMsg && (
          <span className="text-[11px] font-mono font-bold text-emerald-600">
            {inspectionSuccessMsg}
          </span>
        )}
      </div>

      {/* Outcome Condition Selection: Good vs Policy Violation */}
      <div className="space-y-2">
        {delayMins > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span>
              <strong>Overtime Turnover:</strong> Facility event ended <strong>{formatOverdueDuration(delayMins)}</strong> past scheduled time.
            </span>
          </div>
        )}

        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          Inspection Outcome Status *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isHistoryView}
            onClick={() => {
              if (setInspectionStatus) setInspectionStatus("clean");
              if (setViolationNotes && (!violationNotes || violationNotes.toLowerCase().includes("breach") || violationNotes.toLowerCase().includes("damage") || violationNotes.toLowerCase().includes("violation"))) {
                setViolationNotes("Good Condition (Clean Room)");
              }
            }}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              inspectionStatus === "clean"
                ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-1 ring-emerald-500 shadow-2xs"
                : "border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300"
            } ${isHistoryView ? "cursor-not-allowed opacity-80" : ""}`}
          >
            <span className="font-bold">Good</span>
          </button>

          <button
            type="button"
            disabled={isHistoryView}
            onClick={() => {
              if (setInspectionStatus) setInspectionStatus("violation");
              if (setViolationNotes && (violationNotes === "Good Condition (Clean Room)" || violationNotes === "Satisfactory condition recorded. No policy breach notes.")) {
                setViolationNotes("");
              }
            }}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              inspectionStatus === "violation"
                ? "border-rose-500 bg-rose-50/50 text-rose-700 ring-1 ring-rose-500 shadow-2xs"
                : "border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300"
            } ${isHistoryView ? "cursor-not-allowed opacity-80" : ""}`}
          >
            <span className="font-bold">Policy Violation</span>
          </button>
        </div>
      </div>

      {/* Violation Type Section */}
      {inspectionStatus === "violation" && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <label className="block text-[11px] font-bold text-slate-700">
            Violation Category *
          </label>

          {isHistoryView ? (
            <div className="font-mono text-xs font-bold text-rose-600 py-1">
              {selectedViolationType || "Policy Breach Identified"}
            </div>
          ) : (
            <select
              value={selectedViolationType || ""}
              onChange={(e) => setSelectedViolationType && setSelectedViolationType(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
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

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          Notes
        </label>
        {isHistoryView ? (
          <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 min-h-[60px]">
            {violationNotes || "Good condition recorded. No policy breach notes."}
          </div>
        ) : (
          <textarea
            rows={3}
            placeholder="Provide additional details regarding facility turnover or notes..."
            value={violationNotes || ""}
            onChange={(e) => setViolationNotes && setViolationNotes(e.target.value)}
            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 transition-all"
          />
        )}
      </div>

      {/* Evidence Photos */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          Evidence Photos
        </label>
        <InspectionPhotoUploader
          photos={evidencePhoto}
          setPhotos={setEvidencePhoto}
          isReadOnly={isHistoryView}
          onPreview={(photoUrl) => setFullImageModal && setFullImageModal(photoUrl)}
        />
      </div>

      {/* Save Action Button */}
      {!isHistoryView && (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
          {handleSavePostInspection && (
            <button
              type="button"
              disabled={savingInspection}
              onClick={handleSavePostInspection}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
            >
              {savingInspection ? <Loader2 size={13} className="animate-spin" /> : <FileCheck size={13} />}
              <span>Save Record</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
