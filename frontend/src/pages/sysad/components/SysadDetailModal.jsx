import { X, Tag, Clock, Mail, Phone, CheckCircle2 } from "lucide-react";

export default function SysadDetailModal({
  viewingRecord,
  setViewingRecord,
}) {
  if (!viewingRecord) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${
              viewingRecord.type === "Venue"
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "bg-purple-100 text-purple-800 border-purple-300"
            }`}>
              {viewingRecord.type} Reservation Details
            </span>
            <span className="font-mono text-xs font-extrabold text-slate-500">
              {viewingRecord.refNo}
            </span>
          </div>
          <button
            onClick={() => setViewingRecord(null)}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Record Summary Body */}
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-500">Filer / Requestor:</span>
              <span className="font-extrabold text-slate-900">{viewingRecord.requestor}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-500">Department / Office:</span>
              <span className="font-semibold text-slate-700">{viewingRecord.department}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-500">Campus Office Scope:</span>
              <span className="font-extrabold text-blue-700">{viewingRecord.office}</span>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-blue-900">
              <Tag size={15} className="text-blue-600" />
              <span>Reserved Target Item / Venue:</span>
            </div>
            <p className="text-sm font-black text-slate-900 pl-6">{viewingRecord.details}</p>
            <div className="flex items-center gap-2 text-slate-600 pl-6 font-semibold">
              <Clock size={14} className="text-blue-500" />
              <span>{viewingRecord.date}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
            <span className="font-bold text-slate-500 block mb-0.5">Purpose of Usage:</span>
            <p className="font-semibold text-slate-800 italic">{viewingRecord.purpose}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/50 flex items-center gap-1.5">
              <Mail size={13} className="text-slate-400" />
              <span className="truncate">{viewingRecord.email}</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/50 flex items-center gap-1.5">
              <Phone size={13} className="text-slate-400" />
              <span>{viewingRecord.contact}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>Verified by {viewingRecord.office} Admin</span>
          </div>
          <button
            onClick={() => setViewingRecord(null)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs transition-all shadow-md cursor-pointer"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
}
