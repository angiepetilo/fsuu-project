import React, { useState, useEffect } from "react";
import { FileText, ExternalLink, Upload, CheckCircle, HardDrive, Check } from "lucide-react";
import { resolveStorageUrl, openFileInNewTab } from "@/lib/utils";
import { formatDateRange, formatTime12 } from "@/lib/dateUtils";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { detectTelcoNetwork, formatPhilippineNumber } from "@/lib/phoneValidation";

export default function VenueBookingInfo({
  selected,
  formatRealTime = formatTime12,
  formatDateTimeFiled,
  formatDate,
  requestedCategories = [],
}) {
  if (!selected) return null;

  const storageKeyHardcopy = `fsuu_hardcopy_${selected.id}`;
  const storageKeyNotes = `fsuu_hardcopy_notes_${selected.id}`;

  const [isHardcopy, setIsHardcopy] = useState(false);
  const [hardcopyNotes, setHardcopyNotes] = useState("");
  const [staffUploadUrl, setStaffUploadUrl] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [hasHardcopySaved, setHasHardcopySaved] = useState(false);

  useEffect(() => {
    setStaffUploadUrl(null);
    setIsHardcopy(false);
    setHardcopyNotes("");
    try {
      const savedHc = localStorage.getItem(storageKeyHardcopy);
      const savedNotes = localStorage.getItem(storageKeyNotes);
      const isHcActive = savedHc === "true" || selected?.physical_hardcopy_received === 1 || selected?.physical_hardcopy_received === true;
      setHasHardcopySaved(isHcActive);
      if (savedNotes) setHardcopyNotes(savedNotes);
    } catch {}
  }, [selected?.id]);

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

  const getDocumentUrl = () => {
    if (staffUploadUrl) return resolveStorageUrl(staffUploadUrl);
    if (selected.endorsement_url) return resolveStorageUrl(selected.endorsement_url);
    if (selected.endorsement_letter) return resolveStorageUrl(selected.endorsement_letter);
    if (selected.endorsement_letter_url) return resolveStorageUrl(selected.endorsement_letter_url);
    if (selected.endorsement_file) return resolveStorageUrl(selected.endorsement_file);

    if (Array.isArray(selected.documents) && selected.documents.length > 0) {
      const docsReversed = [...selected.documents].reverse();
      const endorsementDoc = docsReversed.find(d => 
        (d.document_type || d.type || "").toLowerCase().includes("endorsement")
      );
      if (endorsementDoc?.file_path) return resolveStorageUrl(endorsementDoc.file_path);
      if (docsReversed[0]?.file_path) return resolveStorageUrl(docsReversed[0].file_path);
    }

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
      <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Applicant Name :</span>
          <span className="font-bold text-slate-900">{filerFullName}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Identity :</span>
          <span className="font-mono text-slate-800 uppercase font-bold">{displayClassification}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Email Address :</span>
          <span className="font-mono text-slate-800">{selected.email_address || selected.email || "—"}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Contact Number :</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-slate-800 font-bold">
              {formatPhilippineNumber(selected.contact_number || selected.contact_no || selected.phone) || "—"}
            </span>
            {(() => {
              const num = selected.contact_number || selected.contact_no || selected.phone;
              const telco = detectTelcoNetwork(num);
              return telco ? (
                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {telco}
                </span>
              ) : null;
            })()}
          </div>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Department / Office :</span>
          <span className="font-bold text-slate-900">{selected.program_office || selected.department || "Academic Dept"}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Venue Reserved :</span>
          <span className="font-bold text-slate-900 font-mono">{selected.venue_name || selected.venue?.name || "AVR Hall 1"}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Date Range :</span>
          <span className="font-mono text-slate-900 font-bold">
            {formatDateRange(
              selected.date_of_usage || selected.start_datetime || selected.date,
              selected.reservation_end_date || selected.end_datetime || selected.end_date
            )}
          </span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Time Range :</span>
          <span className="font-mono text-slate-900 font-bold">
            {formatRealTime(selected.time_start || selected.start_datetime)} - {formatRealTime(selected.time_end || selected.end_datetime)}
          </span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Purpose :</span>
          <span className="font-mono text-slate-800">{selected.purpose || "Event / Meeting"}</span>
        </div>

        {/* Requested Equipment Types Badges */}
        {requestedCategories && requestedCategories.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-slate-500 block mb-1.5 font-bold">Requested Equipment Types :</span>
            <div className="flex flex-wrap gap-1.5">
              {requestedCategories.map((cat, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold font-mono"
                >
                  {cat.name || cat.category || cat.equipment_types_name} ({cat.quantity || 1} {Number(cat.quantity || 1) === 1 ? 'unit' : 'units'})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Column (5/12): Endorsement Document & Walk-in Hardcopy Management */}
      <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <FileText size={14} className="text-blue-600" />
              Endorsement Document :
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {docUrl ? (isPdf ? 'PDF Document' : 'Image File') : (hasHardcopySaved ? 'Hardcopy Filed' : 'Pending File')}
            </span>
          </div>

          {/* Document Preview Viewport */}
          <div className="w-full h-[180px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center relative group border border-slate-200">
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
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
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
                <FileText size={28} className="mx-auto text-slate-600 mb-1" />
                <p className="text-xs font-bold text-slate-300">No Endorsement Document</p>
                <p className="text-[10.5px] text-slate-500 font-mono">Client may submit physical hardcopy at AVR counter</p>
              </div>
            )}
          </div>
        </div>

        {/* Walk-in Hardcopy & Staff Upload Actions */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isHardcopy}
                onChange={(e) => setIsHardcopy(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              <span>Physical Hardcopy Received</span>
            </label>
            
            {/* Attach File is invisible if Hardcopy is already saved/filed */}
            {!hasHardcopySaved && (
              <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold cursor-pointer transition-colors">
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
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 focus:outline-none focus:border-blue-600"
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
            <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
              <CheckCircle size={12} /> {saveSuccessMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
