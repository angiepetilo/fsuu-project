import { useState } from "react";
import { Loader2, Play, FileCheck, Check, ShieldAlert, BellRing, AlertTriangle } from "lucide-react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";

/**
 * VenueModalFooter — Action buttons at the bottom of the venue booking form modal.
 * Follows lifecycle: Pending -> Approved -> Ongoing ("Start Event") -> Post-Inspection ("Start Post-Event Inspection") -> Complete.
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
  canApprove = true,
  canReject = true,
  isStudentAssistant = false,
  showIncompleteForm,
  setShowIncompleteForm,
}) {
  const [notifyingUrgent, setNotifyingUrgent] = useState(false);

  const handleNotifyUrgent = async () => {
    if (!selected?.id) return;
    const ref = selected?.tracking_number?.reference_code || selected?.reference_code || `TRK-AVR-${selected?.id}`;
    setNotifyingUrgent(true);
    try {
      const res = await api.post(`/avr-venue-bookings/${selected.id}/notify-urgent`, {
        reason: "Urgent approval requested by Student Assistant for event release."
      });
      const trackingNumber = res.data?.tracking_number || ref;
      notify.warning(
        `Urgent Approval with (${trackingNumber})`,
        res.data?.message || `Urgent approval notification dispatched for ${trackingNumber}. Notified Staff & Super Admin.`
      );
      window.dispatchEvent(new CustomEvent("urgent_approval_notified", {
        detail: {
          tracking_number: trackingNumber,
          reference_code: trackingNumber,
          type: "venue_booking",
          id: selected.id
        }
      }));
    } catch (err) {
      notify.error("Notification Failed", err.response?.data?.message || "Failed to dispatch urgent notification.");
    } finally {
      setNotifyingUrgent(false);
    }
  };

  return (
    <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
      {isPending ? (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Mark Incomplete is available to both Student Assistants and Staff/Admins */}
          <button
            type="button"
            onClick={() => {
              if (setShowIncompleteForm) setShowIncompleteForm(prev => !prev);
              if (setShowRejectForm) setShowRejectForm(false);
            }}
            disabled={!!actionLoading}
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-xl shadow-2xs transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            title="Mark booking incomplete and set 24-48h grace period"
          >
            <AlertTriangle size={14} className="text-amber-600" />
            <span>Mark Incomplete</span>
          </button>

          {!canApprove ? (
            <button
              type="button"
              onClick={handleNotifyUrgent}
              disabled={notifyingUrgent}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              title="Urgent Approval"
            >
              {notifyingUrgent ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
              <span>Urgent Approval</span>
            </button>
          ) : (
            <>
              {canReject && (
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectForm(true);
                    if (setShowIncompleteForm) setShowIncompleteForm(false);
                  }}
                  disabled={!!actionLoading}
                  className="px-5 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 font-bold text-xs rounded-xl shadow-2xs transition-all duration-150 cursor-pointer disabled:opacity-50"
                >
                  Reject Booking
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAction(selected.id, "approve")}
                disabled={!!actionLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading === `${selected.id}-approve` ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>Approve Booking</span>
              </button>
            </>
          )}
        </div>
      ) : isApproved ? (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleAction(selected.id, "ongoing")}
            disabled={!!actionLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all duration-150 cursor-pointer"
          >
            {actionLoading === `${selected.id}-ongoing` || actionLoading === "ongoing" ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Starting Event...</span>
              </>
            ) : (
              <>
                <Play size={13} className="fill-white" />
                <span>Start Event</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : isOngoing ? (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleAction(selected.id, "post-inspection")}
            disabled={!!actionLoading}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all duration-150 cursor-pointer"
          >
            {actionLoading === `${selected.id}-post-inspection` ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Opening Inspection...</span>
              </>
            ) : (
              <>
                <ShieldAlert size={14} />
                <span>Start Post-Event Inspection</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer"
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
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all duration-150 cursor-pointer"
          >
            {actionLoading === `${selected.id}-complete` || actionLoading === "complete" ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Completing Reservation...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Complete Reservation</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setSelected(null); setShowRejectForm(false); }}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer"
        >
          Close
        </button>
      )}
    </div>
  );
}
