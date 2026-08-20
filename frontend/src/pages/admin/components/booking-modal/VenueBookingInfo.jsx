import React, { useState, useEffect } from "react";
import { FileText, Eye, Upload, CheckCircle, FileCheck, HardDrive, ExternalLink } from "lucide-react";
import { resolveStorageUrl } from "@/lib/utils";

export default function VenueBookingInfo({
  selected,
  formatRealTime,
  formatDateTimeFiled,
  formatDate,
  requestedCategories = [],
  setFullImageModal,
}) {
  if (!selected) return null;

  const storageKeyHardcopy = `fsuu_hardcopy_${selected.id}`;
  const storageKeyNotes = `fsuu_hardcopy_notes_${selected.id}`;

  const [isHardcopy, setIsHardcopy] = useState(false);
  const [hardcopyNotes, setHardcopyNotes] = useState("");
  const [staffUploadUrl, setStaffUploadUrl] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    setStaffUploadUrl(null);
    try {
      // Clear any legacy stale localStorage upload entries
      localStorage.removeItem(`fsuu_staff_upload_${selected.id}`);
      const savedHc = localStorage.getItem(storageKeyHardcopy);
      const savedNotes = localStorage.getItem(storageKeyNotes);
      if (savedHc === "true" || selected.physical_hardcopy_received) setIsHardcopy(true);
      if (savedNotes) setHardcopyNotes(savedNotes);
    } catch {}
  }, [selected.id]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target.result;
      setStaffUploadUrl(result);
      setSaveSuccessMsg("Endorsement letter file attached.");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveHardcopy = () => {
    try {
      localStorage.setItem(storageKeyHardcopy, isHardcopy ? "true" : "false");
      localStorage.setItem(storageKeyNotes, hardcopyNotes);
    } catch {}
    setSaveSuccessMsg("Walk-in endorsement status saved.");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const getDocumentUrl = () => {
    // 1. Direct endorsement URL on selected booking
    if (selected.endorsement_url) return resolveStorageUrl(selected.endorsement_url);
    if (selected.endorsement_letter) return resolveStorageUrl(selected.endorsement_letter);
    if (selected.endorsement_letter_url) return resolveStorageUrl(selected.endorsement_letter_url);
    if (selected.endorsement_file) return resolveStorageUrl(selected.endorsement_file);

    // 2. Search documents relation (pick latest document)
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
    if (staffUploadUrl) return resolveStorageUrl(staffUploadUrl);
    return null;
  };

  const docUrl = getDocumentUrl();
  const isPdf = String(docUrl || "").toLowerCase().includes(".pdf") || String(docUrl || "").toLowerCase().includes("data:application/pdf");
  const [imageLoadError, setImageLoadError] = useState(false);

  const handleOpenDocument = (url) => {
    if (!url) return;
    if (url.startsWith("data:")) {
      try {
        const parts = url.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } catch {
        window.open(url, "_blank");
      }
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Column (7/12): Requestor & Reservation Details in Clean Label-Value Table Layout */}
      <div className="lg:col-span-7 space-y-2 text-xs text-slate-700 font-semibold bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Requestor :</span>
          <span className="font-bold text-slate-900 font-mono">{selected.filer_name || selected.requestor_name || "—"}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Personal email :</span>
          <span className="font-mono text-slate-800">{selected.email_address || selected.email || "—"}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Contact Number :</span>
          <span className="font-mono text-slate-800">{selected.contact_number || selected.phone || "—"}</span>
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
            {selected.reservation_end_date && String(selected.reservation_end_date).substring(0, 10) !== String(selected.date_of_usage).substring(0, 10)
              ? `${String(selected.date_of_usage).substring(0, 10)} to ${String(selected.reservation_end_date).substring(0, 10)}`
              : (selected.date_of_usage ? String(selected.date_of_usage).substring(0, 10) : (formatDate ? formatDate(selected.created_at) : "2026-08-03"))
            }
          </span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Start Time :</span>
          <span className="font-mono font-bold text-slate-900">{formatRealTime(selected.time_start || "08:00:00")}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">End Time :</span>
          <span className="font-mono font-bold text-slate-900">{formatRealTime(selected.time_end || "17:00:00")}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
          <span className="text-slate-500">Event Purpose :</span>
          <span className="font-medium text-slate-800 italic">"{selected.purpose || selected.title_of_reservation || "Event"}"</span>
        </div>

        <div className="flex justify-between items-baseline py-1">
          <span className="text-slate-500">Equipment Needed :</span>
          <span className="font-mono font-bold text-slate-800">
            {requestedCategories.length > 0
              ? requestedCategories.map(c => `${c.category} [${c.quantity}]`).join(", ")
              : "None specified"}
          </span>
        </div>

        {/* Walk-in Physical Hardcopy Status Card in Plain Text */}
        {isHardcopy && (
          <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-xs">
            <div className="text-emerald-600 font-extrabold flex items-center gap-1.5">
              ● Physical Hardcopy Verified &amp; Filed
            </div>
            <p className="text-[11px] text-slate-600 font-medium leading-tight">
              {hardcopyNotes || "Paper endorsement letter physically received and filed in office binder."}
            </p>
          </div>
        )}
      </div>

      {/* Right Column (5/12): Endorsement letter preview with neutral outlined button */}
      <div className="lg:col-span-5 p-4 bg-white rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">
              Endorsement Document :
            </span>
            <span className="text-[10.5px] font-mono font-bold text-slate-500">
              {docUrl ? (isPdf ? "PDF Attached" : "Image Attached") : isHardcopy ? "Hardcopy Filed" : "Pending File"}
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-52 flex items-center justify-center">
            {docUrl ? (
              isPdf ? (
                <div className="w-full h-full p-5 bg-slate-900 flex flex-col items-center justify-center text-center space-y-2.5">
                  <FileText size={28} className="text-slate-300" />
                  <div>
                    <h5 className="text-xs font-extrabold text-white">Signed Endorsement Clearance</h5>
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
                  {!imageLoadError ? (
                    <img
                      src={docUrl}
                      alt="Endorsement Letter Preview"
                      className="w-full h-full object-contain bg-slate-950 p-1"
                      onError={() => setImageLoadError(true)}
                    />
                  ) : (
                    <div className="w-full h-full p-4 bg-slate-900 flex flex-col items-center justify-center text-center space-y-2">
                      <FileText size={28} className="text-blue-400" />
                      <p className="text-xs font-bold text-white">Endorsement Image Attached</p>
                      <p className="text-[10px] font-mono text-slate-400 truncate max-w-[180px]">{docUrl.split('/').pop()}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenDocument(docUrl)}
                    className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors cursor-pointer"
                  >
                    <span className="text-slate-900 text-xs font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                      <ExternalLink size={14} /> Open Document
                    </span>
                  </button>
                </>
              )
            ) : (
              <div className="text-center p-4 space-y-1 text-slate-400">
                <FileText size={28} className="mx-auto" />
                <p className="text-xs font-medium">No digital document attached</p>
              </div>
            )}
          </div>
        </div>

        {/* Staff Upload Section */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {saveSuccessMsg && (
            <p className="text-[10.5px] font-mono text-emerald-600 font-bold">{saveSuccessMsg}</p>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors">
              <Upload size={13} /> Upload Digital Copy
              <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              type="button"
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              {showUploadForm ? "Hide Options" : "Walk-in Options"}
            </button>
          </div>

          {showUploadForm && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={isHardcopy}
                  onChange={(e) => setIsHardcopy(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                Mark as Walk-in Physical Hardcopy Filed
              </label>
              {isHardcopy && (
                <input
                  type="text"
                  placeholder="e.g. Binder 2026-A, Page 4"
                  value={hardcopyNotes}
                  onChange={(e) => setHardcopyNotes(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
                />
              )}
              <button
                type="button"
                onClick={handleSaveHardcopy}
                className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Save Walk-in Status
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
