import { Loader2, Play, FileCheck, Check } from "lucide-react";

/**
 * VenueModalFooter — Action buttons at the bottom of the booking form modal.
 * Button set changes based on which lifecycle stage the booking is in.
 */
export default function VenueModalFooter({
  isPending,
  isApproved,
  isOngoing,
  isPostInspection,
  selected,
  handleAction,
  handleDoneComplete,
  actionLoading,
  savingInspection,
  setSelected,
  setShowRejectForm,
  showRejectForm,
  rejectionComments,
  setRejectionComments,
}) {
  return (
    <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
      {isPending ? (
        <>
          <button
            type="button"
            onClick={() => setShowRejectForm(true)}
            disabled={!!actionLoading}
            className="px-6 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 font-bold text-xs rounded-lg shadow-2xs transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => handleAction(selected.id, "approve")}
            disabled={!!actionLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs rounded-lg shadow-2xs transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {actionLoading === `${selected.id}-approve` ? <Loader2 size={14} className="animate-spin" /> : null}
            Approve
          </button>
        </>
      ) : isApproved ? (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleAction(selected.id, "ongoing")}
            disabled={!!actionLoading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all duration-150 cursor-pointer"
          >
            <Play size={13} /> Set On-Going
          </button>
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : isOngoing ? (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : isPostInspection ? (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDoneComplete}
            disabled={!!actionLoading || savingInspection}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-all duration-150 cursor-pointer"
          >
            <Check size={13} /> Complete Event
          </button>
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setSelected(null); setShowRejectForm(false); }}
          className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer"
        >
          Close
        </button>
      )}
    </div>
  );
}
