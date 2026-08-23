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
            className="px-6 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-rose-600 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => handleAction(selected.id, "approve")}
            disabled={!!actionLoading}
            className="px-6 py-2 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 font-extrabold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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
            className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Play size={13} /> Set On-Going
          </button>
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : isOngoing ? (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
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
            className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={13} /> Complete Event
          </button>
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setSelected(null); setShowRejectForm(false); }}
          className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
        >
          Close
        </button>
      )}
    </div>
  );
}
