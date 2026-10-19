import React, { useState, useEffect } from "react";
import { FileText, ExternalLink, Upload, CheckCircle, CheckCircle2, HardDrive, Check, Shield } from "lucide-react";
import { resolveStorageUrl, openFileInNewTab } from "@/lib/utils";
import { formatDateRange, formatTime12 } from "@/lib/dateUtils";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { formatPhilippineNumber } from "@/lib/phoneValidation";
import { usePermissions } from "@/hooks/usePermissions";
import SuperAdminVenueOverrideModal from "./SuperAdminVenueOverrideModal";

export const extractEquipmentNeededRemarks = (booking) => {
  if (!booking) return "";
  if (booking.equipment_needed_remarks && typeof booking.equipment_needed_remarks === "string") {
    return booking.equipment_needed_remarks.trim();
  }
  if (booking.equipment_remarks && typeof booking.equipment_remarks === "string") {
    return booking.equipment_remarks.trim();
  }
  const notes = booking.equipment_notes || booking.equipment_inspection_remarks || "";
  if (typeof notes === "string" && notes.trim()) {
    if (/Equipment[\s_-]*Needed:\s*/i.test(notes)) {
      const parts = notes.split(/Equipment[\s_-]*Needed:\s*/i);
      return parts[parts.length - 1]?.trim() || "";
    }
    const hasCategoryQtyPattern = /\b(qty:\s*\d+|\(\d+\s*units?\))/i.test(notes);
    if (!hasCategoryQtyPattern) {
      return notes.trim();
    }
  }
  return "";
};

export default function VenueBookingInfo({
  selected,
  formatRealTime = formatTime12,
  formatDateTimeFiled,
  formatDate,
  requestedCategories = [],
  setFullImageModal,
  onBookingUpdated,
}) {
  const { isSuperAdmin } = usePermissions();
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideFocusField, setOverrideFocusField] = useState("venue");

  const handleOpenOverride = (field = "venue") => {
    setOverrideFocusField(field);
    setShowOverrideModal(true);
  };

  const storageKeyHardcopy = selected?.id ? `fsuu_hardcopy_${selected.id}` : null;
  const storageKeyNotes = selected?.id ? `fsuu_hardcopy_notes_${selected.id}` : null;

  const [isHardcopy, setIsHardcopy] = useState(false);
  const [hardcopyNotes, setHardcopyNotes] = useState("");
  const [staffUploadUrl, setStaffUploadUrl] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [hasHardcopySaved, setHasHardcopySaved] = useState(false);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);

  useEffect(() => {
    setStaffUploadUrl(null);
    setIsHardcopy(false);
    setHardcopyNotes("");
    if (!storageKeyHardcopy) return;
    try {
      const savedHc = localStorage.getItem(storageKeyHardcopy);
      const savedNotes = localStorage.getItem(storageKeyNotes);
      const isHcActive = savedHc === "true" || selected?.physical_hardcopy_received === 1 || selected?.physical_hardcopy_received === true;
      setHasHardcopySaved(isHcActive);
      if (savedNotes) setHardcopyNotes(savedNotes);
    } catch {}
  }, [selected?.id, storageKeyHardcopy, storageKeyNotes]);

  if (!selected) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setStaffUploadUrl(evt.target.result);
    };
    reader.readAsDataURL(file);

    if (selected.id) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("document", file);
        const res = await api.post(`/avr-venue-bookings/${selected.id}/upload-document`, formData);
        if (res.data?.url) {
          setStaffUploadUrl(res.data.url);
        }
        setSaveSuccessMsg("Endorsement letter attached and uploaded.");
        notify.success("Document Uploaded", "Endorsement letter attached and uploaded.");
      } catch {
        setSaveSuccessMsg("Document attached locally.");
        notify.info("Document Attached", "Document attached locally.");
      } finally {
        setIsUploading(false);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      }
    }
  };

  const handleSaveHardcopy = () => {
    try {
      localStorage.setItem(storageKeyHardcopy, "true");
      localStorage.setItem(storageKeyNotes, hardcopyNotes);
    } catch {}
    setHasHardcopySaved(true);
    setIsHardcopy(false);
    setSaveSuccessMsg("Walk-in endorsement status saved.");
    notify.success("Walk-in Endorsement", "Walk-in endorsement status saved.");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const allDocs = (() => {
    const list = [];
    if (staffUploadUrl) list.push({ url: staffUploadUrl, label: "Staff Upload" });
    if (Array.isArray(selected.documents) && selected.documents.length > 0) {
      selected.documents.forEach((d, idx) => {
        if (d?.file_path && !list.some(existing => existing.url === d.file_path)) {
          list.push({ url: d.file_path, label: d.document_type ? d.document_type.replace(/_/g, " ") : `Doc #${idx + 1}` });
        }
      });
    }
    if (selected.endorsement_url && !list.some(d => d.url === selected.endorsement_url)) {
      list.push({ url: selected.endorsement_url, label: "Endorsement" });
    }
    if (selected.endorsement_letter && !list.some(d => d.url === selected.endorsement_letter)) {
      list.push({ url: selected.endorsement_letter, label: "Endorsement Letter" });
    }
    if (selected.attachment && !list.some(d => d.url === selected.attachment)) {
      list.push({ url: selected.attachment, label: "Attachment" });
    }
    return list;
  })();


  const getDocumentUrl = () => {
    if (allDocs.length > 0) {
      const active = allDocs[selectedDocIndex] || allDocs[0];
      return resolveStorageUrl(active.url);
    }
    if (staffUploadUrl) return resolveStorageUrl(staffUploadUrl);
    if (selected.endorsement_url) return resolveStorageUrl(selected.endorsement_url);
    if (selected.endorsement_letter) return resolveStorageUrl(selected.endorsement_letter);
    if (selected.endorsement_letter_url) return resolveStorageUrl(selected.endorsement_letter_url);
    if (selected.endorsement_file) return resolveStorageUrl(selected.endorsement_file);
    if (selected.file_path) return resolveStorageUrl(selected.file_path);
    if (selected.attachment) return resolveStorageUrl(selected.attachment);
    return null;
  };

  const docUrl = getDocumentUrl();
  const isPdf = String(docUrl || "").toLowerCase().includes(".pdf") || String(docUrl || "").toLowerCase().includes("data:application/pdf");

  const handleOpenDocument = (url) => {
    if (!url) return;
    openFileInNewTab(url);
  };

  const filerFullName = [selected.first_name, selected.middle_name, selected.last_name, selected.suffix]
    .filter(Boolean)
    .join(" ")
    .trim() || selected.filer_name || selected.name || selected.full_name || "Applicant";

  const rawClassification = selected.classification || selected.role || "student";
  const displayClassification = rawClassification.toLowerCase() === "student" ? "Student" : (rawClassification.toLowerCase().includes("fac") ? "Faculty" : "External");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Column (7/12): Core Request Details */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-blue-900/50 space-y-2 text-xs">
        {isSuperAdmin && (
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Reservation Details
            </span>
            <button
              type="button"
              onClick={() => handleOpenOverride("venue")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700/80 text-[10.5px] font-extrabold transition-all cursor-pointer shadow-2xs"
              title="Super Admin Override: Reassign Venue, Date & Time"
            >
              <Shield size={12} className="text-amber-600 dark:text-amber-400" />
              <span>Override Venue / Schedule</span>
            </button>
          </div>
        )}

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Applicant Name :</span>
          <span className="font-bold text-slate-900 dark:text-white">{filerFullName}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Identity :</span>
          <span className="font-mono text-slate-800 dark:text-slate-200 uppercase font-bold">{displayClassification}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80 gap-1">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">Email Address :</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-slate-800 dark:text-slate-200 break-all">{selected.email_address || selected.email || "—"}</span>
            {(selected.is_email_verified ?? true) && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0" title="Email address verified via OTP">
                <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                Verified
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Contact Number :</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
              {formatPhilippineNumber(selected.contact_number || selected.contact_no || selected.phone) || "—"}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Department / Office :</span>
          <span className="font-bold text-slate-900 dark:text-white">{selected.program_office || selected.department || "Academic Dept"}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Venue Reserved :</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 dark:text-white font-mono">{selected.venue_name || selected.venue?.name || "AVR Hall 1"}</span>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => handleOpenOverride("venue")}
                className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer shadow-2xs"
                title="Super Admin Override: Reassign Venue"
              >
                Override
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Date Range :</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-slate-900 dark:text-white font-bold">
              {formatDateRange(
                selected.date_of_usage || selected.start_datetime || selected.date,
                selected.reservation_end_date || selected.end_datetime || selected.end_date
              )}
            </span>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => handleOpenOverride("date")}
                className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer shadow-2xs"
                title="Super Admin Override: Change Date Range"
              >
                Override
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Time Range :</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-slate-900 dark:text-white font-bold">
              {formatRealTime(selected.time_start || selected.start_datetime)} - {formatRealTime(selected.time_end || selected.end_datetime)}
            </span>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => handleOpenOverride("time")}
                className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer shadow-2xs"
                title="Super Admin Override: Change Time Window"
              >
                Override
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Purpose :</span>
          <span className="font-mono text-slate-800 dark:text-slate-200">{selected.purpose || "Event / Meeting"}</span>
        </div>

        {/* Equipment-Needed Remarks (Optional) - Read-Only Display */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80 gap-1">
          <span className="text-slate-500 dark:text-slate-400 shrink-0 font-medium">Equipment-Needed Remarks (Optional) :</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 break-words text-left sm:text-right max-w-sm">
            {extractEquipmentNeededRemarks(selected) || "None"}
          </span>
        </div>

        {/* Requested Equipment Types Badges */}
        {requestedCategories && requestedCategories.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400 block mb-1.5 font-bold">Requested Equipment Types :</span>
            <div className="flex flex-wrap gap-1.5">
              {requestedCategories.map((cat, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold font-mono"
                >
                  {cat.name || cat.category || cat.equipment_types_name} ({cat.quantity || 1} {Number(cat.quantity || 1) === 1 ? 'unit' : 'units'})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Column (5/12): Endorsement Document & Walk-in Hardcopy Management */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-blue-900/50 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <span className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <FileText size={14} className="text-blue-600 dark:text-blue-400" />
              Endorsement Document :
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
              {docUrl ? (isPdf ? 'PDF Document' : 'Image File') : (hasHardcopySaved ? 'Hardcopy Filed' : 'Pending File')}
            </span>
          </div>

          {/* Multiple Document Selector Tabs */}
          {allDocs.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {allDocs.map((doc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDocIndex(idx)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer shrink-0 ${
                    selectedDocIndex === idx
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  Doc #{idx + 1}
                </button>
              ))}
            </div>
          )}

          {/* Document Preview Viewport */}
          <div className="w-full h-[180px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center relative group border border-slate-200 dark:border-blue-900/50">
            {docUrl ? (
              isPdf ? (
                <div className="w-full h-full p-4 bg-slate-900 flex flex-col items-center justify-center text-center space-y-2">
                  <FileText size={32} className="text-blue-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Official Endorsement PDF</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[180px]">
                      {docUrl.startsWith('data:') ? 'Official Attached PDF' : docUrl.split('/').pop()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDocument(docUrl)}
                    className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <ExternalLink size={13} /> Open in New Tab
                  </button>
                </div>
              ) : (
                <>
                  <img
                    src={docUrl}
                    alt="Endorsement Letter"
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDocument(docUrl)}
                      className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink size={12} /> View Full
                    </button>
                  </div>
                </>
              )
            ) : (
              <div className="text-center p-4 space-y-1">
                <FileText size={28} className="mx-auto text-slate-600 dark:text-slate-500 mb-1" />
                <p className="text-xs font-bold text-slate-300 dark:text-slate-300">No Endorsement Document</p>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">Client may submit physical hardcopy at AVR counter</p>
              </div>
            )}
          </div>
        </div>

        {/* Walk-in Hardcopy & Staff Upload Actions */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isHardcopy}
                onChange={(e) => setIsHardcopy(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <span>Physical Hardcopy Received</span>
            </label>
            
            {/* Attach File is invisible if Hardcopy is already saved/filed */}
            {!hasHardcopySaved && (
              <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 text-[11px] font-bold cursor-pointer transition-colors">
                <Upload size={12} />
                <span>{isUploading ? "Uploading..." : "Attach File"}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
          </div>

          {isHardcopy && (
            <div className="space-y-1.5 animate-in fade-in">
              <input
                type="text"
                placeholder="Receiver note (e.g. Received signed memo by Prof. Santos)"
                value={hardcopyNotes}
                onChange={(e) => setHardcopyNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={handleSaveHardcopy}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Save
              </button>
            </div>
          )}

          {saveSuccessMsg && (
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <CheckCircle size={12} /> {saveSuccessMsg}
            </p>
          )}
        </div>
      </div>

      {/* Super Admin Venue & Schedule Override Modal */}
      {isSuperAdmin && showOverrideModal && (
        <SuperAdminVenueOverrideModal
          isOpen={showOverrideModal}
          onClose={() => setShowOverrideModal(false)}
          booking={selected}
          onBookingUpdated={onBookingUpdated}
          initialFocusField={overrideFocusField}
        />
      )}
    </div>
  );
}
