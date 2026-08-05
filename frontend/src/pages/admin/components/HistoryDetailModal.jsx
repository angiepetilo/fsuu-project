import {
  X, User, FileText, ShieldCheck, CheckCircle2, AlertTriangle, Upload
} from "lucide-react";

export default function HistoryDetailModal({
  viewingHistoryItem,
  setViewingHistoryItem,
  postInspection,
  setPostInspection,
  handleImageUpload,
  handleSaveInspection,
}) {
  if (!viewingHistoryItem) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-blue-600/30 border border-blue-400/40 text-blue-300 font-mono text-xs font-bold rounded-xl tracking-wider">
              {viewingHistoryItem.reference_code || `TRK-${viewingHistoryItem.id}`}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-400" />
                Archived Log Details & Post-Event Inspection
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">Completed Record Audit & Clearance Report</p>
            </div>
          </div>
          <button
            onClick={() => setViewingHistoryItem(null)}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Side-by-Side 2/3 & 1/3 Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-100 flex-1">

          {/* Left Column (2/3 Width): Filer Info, Item Details & Endorsement File */}
          <div className="lg:col-span-8 p-6 space-y-6">

            {/* Filer Information */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <User size={14} className="text-blue-600" />
                Filer / Requestor Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Full Filer Name</span>
                  <span className="font-extrabold text-slate-900 text-sm block">{viewingHistoryItem.filer_name || "Maria Santos"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Department / Office</span>
                  <span className="font-semibold text-slate-800 block">{viewingHistoryItem.program_office || "College of Computing Studies"}</span>
                </div>
              </div>
            </div>

            {/* Reservation / Borrowing Item Details */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileText size={14} className="text-blue-600" />
                Booked Venue / Equipment Item
              </h4>
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-2.5 text-xs">
                <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                  <span className="font-bold text-blue-900">Reserved Resource Name:</span>
                  <span className="font-extrabold text-blue-950 text-sm bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-2xs">
                    {viewingHistoryItem.venue_name || viewingHistoryItem.equipment_name || viewingHistoryItem.item_name || "AVR 1 (Audio-Visual Room 1)"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700 font-semibold pt-1">
                  <span>Date of Usage: <strong>{viewingHistoryItem.date_of_usage || "Aug 3, 2026"}</strong></span>
                  <span>Category: <strong className="capitalize">{viewingHistoryItem.record_type || "venue"}</strong></span>
                </div>
              </div>
            </div>

            {/* Endorsement Letter File View */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText size={14} className="text-blue-600" />
                Uploaded Endorsement Document
              </h4>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    PDF
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">
                      {viewingHistoryItem.endorsement_letter || "endorsement_letter_approved.pdf"}
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold">Official FSUU Endorsement Upload</p>
                  </div>
                </div>
                <a
                  href={viewingHistoryItem.endorsement_letter_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs"
                >
                  View File
                </a>
              </div>
            </div>

          </div>

          {/* Right Column (1/3 Width): Post-Event Clearance & Inspection Report */}
          <div className="lg:col-span-4 p-6 bg-slate-50/50 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <ShieldCheck size={16} className="text-blue-600" />
              Post-Event Clearance
            </h4>

            <p className="text-xs text-slate-500 font-medium">
              Select item condition status for archival record & reports:
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPostInspection({ ...postInspection, condition: "clean" })}
                className={`py-2.5 px-4 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  postInspection.condition === "clean"
                    ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <CheckCircle2 size={16} /> Clean / Compliant
              </button>
              <button
                type="button"
                onClick={() => setPostInspection({ ...postInspection, condition: "violation" })}
                className={`py-2.5 px-4 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  postInspection.condition === "violation"
                    ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <AlertTriangle size={16} /> Damages / Rule Violation
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Violation Details & Notes</label>
                <textarea
                  rows={2}
                  value={postInspection.details}
                  onChange={e => setPostInspection({ ...postInspection, details: e.target.value })}
                  placeholder="Describe uncleaned condition, broken unit..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Inspected By (Staff Name)</label>
                <input
                  type="text"
                  value={postInspection.staffName}
                  onChange={e => setPostInspection({ ...postInspection, staffName: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Upload Photo Evidence</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all">
                    <Upload size={13} /> Upload File
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {(postInspection.imagePreview || viewingHistoryItem.evidence_photo || viewingHistoryItem.evidencePhoto) ? "Photo Attached ✅" : "No photo"}
                  </span>
                </div>
              </div>

              {(postInspection.imagePreview || viewingHistoryItem.evidence_photo || viewingHistoryItem.evidencePhoto) && (
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-700 text-center space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider block">
                    Recorded Photo Evidence
                  </span>
                  <a
                    href={postInspection.imagePreview || viewingHistoryItem.evidence_photo || viewingHistoryItem.evidencePhoto}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                  >
                    📷 Tap to View Image Evidence
                  </a>
                  <div className="rounded-xl overflow-hidden border border-slate-700 max-h-36">
                    <img
                      src={postInspection.imagePreview || viewingHistoryItem.evidence_photo || viewingHistoryItem.evidencePhoto}
                      alt="Evidence Thumbnail"
                      className="w-full h-36 object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleSaveInspection(viewingHistoryItem)}
              className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer"
            >
              Save Clearance Report
            </button>
          </div>


        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-slate-500">
            Archived under FSUU Operations Audit Protocol
          </span>
          <button
            type="button"
            onClick={() => setViewingHistoryItem(null)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
}
