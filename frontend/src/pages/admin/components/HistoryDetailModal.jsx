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

  const isDamaged = postInspection.condition === "violation" || viewingHistoryItem.has_damage || (viewingHistoryItem.status || "").toLowerCase() === "damaged";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Archived Log Details &amp; Post-Event Inspection
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-0.5">
              <span>Track No. :</span>
              <span className="font-mono text-slate-900 font-bold">
                {viewingHistoryItem.reference_code || `TRK-${viewingHistoryItem.id}`}
              </span>
              <span>•</span>
              <span className="font-bold text-slate-700">
                {viewingHistoryItem.venue_name || viewingHistoryItem.equipment_name || viewingHistoryItem.item_name || "Resource"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewingHistoryItem(null)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Hairline Divider Label-Value Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200 flex-1">

          {/* Left Column (7/12 Width): Filer Info & Reservation Details */}
          <div className="lg:col-span-7 p-6 space-y-4 text-xs font-semibold">
            <div className="border-b border-slate-200 pb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Section 1: Filer &amp; Booking Details
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="text-slate-500">Requestor / Filer :</span>
                <span className="font-bold text-slate-900 font-mono">{viewingHistoryItem.filer_name || "Maria Santos"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="text-slate-500">Department / Office :</span>
                <span className="font-bold text-slate-900">{viewingHistoryItem.program_office || "College of Computing Studies"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="text-slate-500">Resource / Venue :</span>
                <span className="font-bold text-slate-900 font-mono">{viewingHistoryItem.venue_name || viewingHistoryItem.equipment_name || viewingHistoryItem.item_name || "AVR 1"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="text-slate-500">Date of Usage :</span>
                <span className="font-mono text-slate-900 font-bold">{viewingHistoryItem.date_of_usage || "Aug 3, 2026"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="text-slate-500">Category Scope :</span>
                <span className="font-mono uppercase text-slate-800 font-bold">{viewingHistoryItem.record_type || "venue"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="text-slate-500">Endorsement Document :</span>
                <span className="font-mono text-slate-700">
                  {viewingHistoryItem.endorsement_letter || "Official_Endorsement.pdf"}
                </span>
              </div>
            </div>

            {/* Endorsement Document Link */}
            <div className="pt-2">
              <a
                href={viewingHistoryItem.endorsement_letter_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all shadow-2xs"
              >
                <FileText size={13} className="text-slate-600" />
                <span>View Endorsement Attachment</span>
              </a>
            </div>
          </div>

          {/* Right Column (5/12 Width): Post-Event Clearance & Inspection Report */}
          <div className="lg:col-span-5 p-6 space-y-4 text-xs font-semibold">
            <div className="border-b border-slate-200 pb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Section 2: Post-Event Clearance Status
              </span>
            </div>

            {/* Condition Selection: Plain text color status buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-500 block">Inspection Outcome :</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPostInspection({ ...postInspection, condition: "clean" })}
                  className={`py-2 px-3 rounded-lg border text-xs font-extrabold cursor-pointer transition-all ${
                    postInspection.condition === "clean"
                      ? "border-slate-900 bg-white text-emerald-600 ring-1 ring-slate-900"
                      : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className={postInspection.condition === "clean" ? "text-emerald-600" : "text-slate-500"}>
                    ● Good / Clean
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPostInspection({ ...postInspection, condition: "violation" })}
                  className={`py-2 px-3 rounded-lg border text-xs font-extrabold cursor-pointer transition-all ${
                    postInspection.condition === "violation"
                      ? "border-slate-900 bg-white text-rose-600 ring-1 ring-slate-900"
                      : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className={postInspection.condition === "violation" ? "text-rose-600" : "text-slate-500"}>
                    ● Damaged / Violation
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Violation Details &amp; Notes</label>
                <textarea
                  rows={2}
                  value={postInspection.details}
                  onChange={e => setPostInspection({ ...postInspection, details: e.target.value })}
                  placeholder="Notes regarding room or equipment condition..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Inspected By (Staff Name)</label>
                <input
                  type="text"
                  value={postInspection.staffName}
                  onChange={e => setPostInspection({ ...postInspection, staffName: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Photo Evidence</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-all">
                    <Upload size={13} />
                    <span>Select File</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {(postInspection.imagePreview || viewingHistoryItem.evidence_photo || viewingHistoryItem.evidencePhoto) ? "Attached" : "None"}
                  </span>
                </div>
              </div>

              {(postInspection.imagePreview || viewingHistoryItem.evidence_photo || viewingHistoryItem.evidencePhoto) && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Recorded Evidence</span>
                  <a
                    href={postInspection.imagePreview || viewingHistoryItem.evidence_photo || viewingHistoryItem.evidencePhoto}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-slate-800 underline block"
                  >
                    View Photo Evidence &rarr;
                  </a>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSaveInspection(viewingHistoryItem)}
                className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-extrabold cursor-pointer transition-colors"
              >
                Save Clearance Report
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            Audit Protocol • FSUU Operations
          </span>
          <button
            type="button"
            onClick={() => setViewingHistoryItem(null)}
            className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
