import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, FileCheck, Loader2, Plus, X } from "lucide-react";
import InspectionPhotoUploader from "@/components/ui/InspectionPhotoUploader";
import { getOverdueMinutes, formatOverdueDuration } from "@/lib/dateTimeUtils";
import api from "@/lib/axios";

const DEFAULT_VIOLATION_TYPES = [
  "Property Damaged",
  "Overtime",
  "Waste Disposal",
  "Other Policy Violation",
];

export default function VenuePostInspectionForm({
  inspectionStatus,
  setInspectionStatus,
  selectedViolationType,
  setSelectedViolationType,
  violationTypesList = DEFAULT_VIOLATION_TYPES,
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
  const [categories, setCategories] = useState(violationTypesList);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");
  const [savingNewCat, setSavingNewCat] = useState(false);

  // Fetch dynamic categories from backend
  useEffect(() => {
    let isMounted = true;
    api.get("/general/violation-categories")
      .then((res) => {
        if (!isMounted) return;
        const fetched = Array.isArray(res.data) ? res.data.map(c => c.name) : [];
        if (fetched.length > 0) {
          // Merge unique categories with defaults
          const merged = Array.from(new Set([...DEFAULT_VIOLATION_TYPES, ...fetched]));
          setCategories(merged);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const delayMins = minutesLate > 0 ? minutesLate : getOverdueMinutes(scheduledDate, scheduledTime);

  useEffect(() => {
    if (delayMins > 0 && setSelectedViolationType && !selectedViolationType && !isHistoryView) {
      setSelectedViolationType("Overtime");
    }
  }, [delayMins]);

  const handleAddCustomCategory = async (e) => {
    e.preventDefault();
    const cleanName = newCatInput.trim();
    if (!cleanName) return;

    setSavingNewCat(true);
    try {
      await api.post("/general/violation-categories", { name: cleanName });
      setCategories((prev) => Array.from(new Set([...prev, cleanName])));
      if (setSelectedViolationType) setSelectedViolationType(cleanName);
      setNewCatInput("");
      setShowAddCustom(false);
    } catch {
      // If already exists or error, still set locally
      setCategories((prev) => Array.from(new Set([...prev, cleanName])));
      if (setSelectedViolationType) setSelectedViolationType(cleanName);
      setNewCatInput("");
      setShowAddCustom(false);
    } finally {
      setSavingNewCat(false);
    }
  };

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
            {isHistoryView ? "(Read Only History Log)" : "Verify venue condition & policy compliance."}
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
            <span className="font-bold">Good Condition</span>
          </button>

          <button
            type="button"
            disabled={isHistoryView}
            onClick={() => {
              if (setInspectionStatus) setInspectionStatus("violation");
              if (setViolationNotes && (violationNotes === "Good Condition (Clean Room)" || violationNotes === "Satisfactory condition recorded. No policy breach notes.")) {
                setViolationNotes("");
              }
              if (!selectedViolationType && setSelectedViolationType) {
                setSelectedViolationType(delayMins > 0 ? "Overtime" : "Property Damaged");
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
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-slate-700">
              Violation Category *
            </label>
            {!isHistoryView && (
              <button
                type="button"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                {showAddCustom ? <X size={12} /> : <Plus size={12} />}
                <span>{showAddCustom ? "Cancel" : "Add Category"}</span>
              </button>
            )}
          </div>

          {showAddCustom && !isHistoryView && (
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-200 shadow-2xs">
              <input
                type="text"
                placeholder="Enter custom violation name..."
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                disabled={savingNewCat || !newCatInput.trim()}
                onClick={handleAddCustomCategory}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {savingNewCat ? "Saving..." : "Add"}
              </button>
            </div>
          )}

          {isHistoryView ? (
            <div className="font-mono text-xs font-bold text-rose-600 py-1">
              {selectedViolationType || "Policy Violation Identified"}
            </div>
          ) : (
            <select
              value={selectedViolationType || "Property Damaged"}
              onChange={(e) => setSelectedViolationType && setSelectedViolationType(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              {categories.map((vType, idx) => (
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
          Remarks
        </label>
        {isHistoryView ? (
          <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 min-h-[60px]">
            {violationNotes || "Good condition recorded. No policy violation notes."}
          </div>
        ) : (
          <textarea
            rows={3}
            placeholder="Provide additional details regarding facility turnover or policy notes..."
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
