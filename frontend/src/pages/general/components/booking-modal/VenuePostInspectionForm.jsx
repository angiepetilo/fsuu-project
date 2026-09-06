import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, FileCheck, Loader2, Plus, X, Edit, Trash2 } from "lucide-react";
import InspectionPhotoUploader from "@/components/ui/InspectionPhotoUploader";
import { getOverdueMinutes, formatOverdueDuration } from "@/lib/dateTimeUtils";
import api from "@/lib/axios";

const DEFAULT_VIOLATION_TYPES = [];

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
  isAdminOrSuperAdmin = false,
  user = null,
  hasChanges = true,
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
  const [dbCategories, setDbCategories] = useState([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");
  const [savingNewCat, setSavingNewCat] = useState(false);

  // Fetch dynamic categories from backend
  useEffect(() => {
    let isMounted = true;
    api.get("/general/violation-categories")
      .then((res) => {
        if (!isMounted) return;
        const fetchedList = Array.isArray(res.data) ? res.data : [];
        setDbCategories(fetchedList);
        const fetchedNames = fetchedList.map(c => c.name);
        if (fetchedNames.length > 0) {
          // Merge unique categories with defaults
          const merged = Array.from(new Set([...DEFAULT_VIOLATION_TYPES, ...fetchedNames]));
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
      const res = await api.post("/general/violation-categories", { name: cleanName });
      setDbCategories(prev => [...prev, res.data]);
      setCategories((prev) => Array.from(new Set([...prev, cleanName])));
      setNewCatInput("");
    } catch {
      // If already exists or error, still set locally
      setCategories((prev) => Array.from(new Set([...prev, cleanName])));
      setNewCatInput("");
    } finally {
      setSavingNewCat(false);
    }
  };

  const handleDeleteCategory = async (catName) => {
    const catObj = dbCategories.find(c => c.name === catName);
    try {
      if (catObj && catObj.id) {
        await api.delete(`/general/violation-categories/${catObj.id}`);
        setDbCategories(prev => prev.filter(c => c.id !== catObj.id));
      }
      setCategories(prev => prev.filter(c => c !== catName));
      
      // Remove from selection if present
      if (selectedViolationType && selectedViolationType.includes(catName)) {
        const arr = selectedViolationType.split(",").map(s => s.trim()).filter(c => c !== catName && c !== "");
        if (setSelectedViolationType) setSelectedViolationType(arr.join(", "));
      }
    } catch (e) {
      console.error("Failed to delete category", e);
      // Even if API fails (e.g. for a hardcoded default), remove it from the UI
      setCategories(prev => prev.filter(c => c !== catName));
      if (selectedViolationType && selectedViolationType.includes(catName)) {
        const arr = selectedViolationType.split(",").map(s => s.trim()).filter(c => c !== catName && c !== "");
        if (setSelectedViolationType) setSelectedViolationType(arr.join(", "));
      }
    }
  };

  // Checkbox state helper
  const selectedCatsArray = selectedViolationType ? selectedViolationType.split(",").map(s => s.trim()).filter(Boolean) : [];
  
  const handleToggleCategory = (catName) => {
    if (isHistoryView) return;
    let newArr;
    if (selectedCatsArray.includes(catName)) {
      newArr = selectedCatsArray.filter(c => c !== catName);
    } else {
      newArr = [...selectedCatsArray, catName];
    }
    if (setSelectedViolationType) {
      setSelectedViolationType(newArr.join(", "));
    }
  };

  // Determine if remarks should be shown
  const showRemarks = inspectionStatus === "clean" || selectedCatsArray.some(c => c.toLowerCase().includes("other"));

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
                setViolationNotes("Satisfactory Condition (Clean Room)");
              }
            }}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              inspectionStatus === "clean"
                ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-1 ring-emerald-500 shadow-2xs"
                : "border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300"
            } ${isHistoryView ? "cursor-not-allowed opacity-80" : ""}`}
          >
            <span className="font-bold">Satisfactory</span>
          </button>

          <button
            type="button"
            disabled={isHistoryView}
            onClick={() => {
              if (setInspectionStatus) setInspectionStatus("violation");
              if (setViolationNotes && (violationNotes === "Satisfactory Condition (Clean Room)" || violationNotes === "Satisfactory condition recorded. No policy breach notes.")) {
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
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs transition-all">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-slate-700">
              Violation Category *
            </label>
            {!isHistoryView && (
              <button
                type="button"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showAddCustom ? <X size={12} /> : <Edit size={12} />}
                <span>{showAddCustom ? "Save Editing" : "Edit Category"}</span>
              </button>
            )}
          </div>

          {showAddCustom && !isHistoryView && (
            <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-2xs space-y-3 mb-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {categories.map((cat, idx) => (
                   <div key={`edit-cat-${idx}`} className="flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-colors">
                      <span className="font-semibold text-slate-600">{cat}</span>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteCategory(cat)} 
                        className="text-slate-500 hover:text-rose-600 cursor-pointer p-1 rounded hover:bg-rose-50 transition-colors flex items-center gap-1 font-bold"
                        title="Remove Category"
                      >
                          <Trash2 size={12} />
                          <span>Remove</span>
                      </button>
                   </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                <input
                  type="text"
                  placeholder="Enter custom violation name..."
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                <button
                  type="button"
                  disabled={savingNewCat || !newCatInput.trim()}
                  onClick={handleAddCustomCategory}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer flex items-center gap-1 transition-colors shadow-xs"
                >
                  {savingNewCat ? "..." : <><Plus size={12}/> Add</>}
                </button>
              </div>
            </div>
          )}

          {isHistoryView ? (
            <div className="font-mono text-xs font-bold text-rose-600 py-1">
              {selectedViolationType || "Policy Violation Identified"}
            </div>
          ) : (
            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
              {categories.map((vType, idx) => {
                const isChecked = selectedCatsArray.includes(vType);
                return (
                  <label key={`v-opt-${idx}`} className="flex items-center gap-2.5 cursor-pointer p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 hover:shadow-2xs transition-all">
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => handleToggleCategory(vType)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className={`text-xs font-semibold ${isChecked ? 'text-blue-700' : 'text-slate-700'}`}>{vType}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notes (Conditional when violation) */}
      {showRemarks && (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Remarks
          </label>
          {isHistoryView ? (
            <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 min-h-[60px]">
              <span className="font-bold">Inspection Result Notes:</span>
              <p className="text-emerald-700 italic mt-0.5">
                {violationNotes || "Satisfactory condition recorded. No policy violation notes."}
              </p>
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
      )}

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
      {!isHistoryView && hasChanges && (
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

