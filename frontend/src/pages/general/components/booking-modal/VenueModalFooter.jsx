import { useState, useEffect, useMemo } from "react";
import { Loader2, Play, FileCheck, Check, ShieldAlert, BellRing, AlertTriangle, Clock, ShieldCheck, Ban, PackageCheck } from "lucide-react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import { getInspectionEligibility } from "@/lib/dateTimeUtils";
import ConfirmModal from "@/components/ui/ConfirmModal";

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
  isSuperAdmin = false,
  showIncompleteForm,
  setShowIncompleteForm,
  isPostInspectionSaved = false,
  onRequestComplete,
  hasInspectionChanges = false,
}) {
  const [notifyingUrgent, setNotifyingUrgent] = useState(false);
  const [currentTick, setCurrentTick] = useState(() => Date.now());
  const [adminEarlyOverride, setAdminEarlyOverride] = useState(false);
  const [showEarlyOverrideModal, setShowEarlyOverrideModal] = useState(false);
  const [showEarlyReturnModal, setShowEarlyReturnModal] = useState(false);
  const [showCancelApprovedModal, setShowCancelApprovedModal] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState("");

  useEffect(() => {
    if (!isOngoing) return;
    const interval = setInterval(() => {
      setCurrentTick(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, [isOngoing]);

  const scheduledEndDate = selected?.reservation_end_date 
    || selected?.extend_reservation_end_date 
    || selected?.date_of_usage 
    || selected?.date_of_use 
    || selected?.start_datetime;
  const scheduledEndTime = selected?.time_end || selected?.end_datetime || "17:00";

  const inspectionEligibility = useMemo(() => {
    if (!isOngoing) return { isReady: true, minutesUntilUnlock: 0, unlockTimeStr: "", reason: "" };
    return getInspectionEligibility(scheduledEndDate, scheduledEndTime, 30);
  }, [isOngoing, scheduledEndDate, scheduledEndTime, currentTick]);

  const isInspectionReady = isOngoing ? (inspectionEligibility.isReady || adminEarlyOverride) : true;

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
    <>
      <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-blue-900/50 flex items-center justify-end gap-3 shrink-0">
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
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 dark:text-amber-200 dark:border-amber-800/80 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-xl shadow-2xs transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            title="Mark booking incomplete and set 24-48h grace period"
          >
            <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
            <span>Mark Incomplete</span>
          </button>

          {!canApprove ? (
            <button
              type="button"
              onClick={handleNotifyUrgent}
              disabled={notifyingUrgent}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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
                  className="px-5 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 dark:bg-rose-950/60 dark:hover:bg-rose-600 dark:text-rose-300 dark:hover:text-white dark:border-rose-900/60 font-bold text-xs rounded-xl shadow-2xs transition-all duration-150 cursor-pointer disabled:opacity-50"
                >
                  Reject Booking
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAction(selected.id, "approve")}
                disabled={!!actionLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading === `${selected.id}-approve` ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>Approve Booking</span>
              </button>
            </>
          )}
        </div>
      ) : isApproved ? (
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {canReject && (
            <button
              type="button"
              onClick={() => {
                setCancelRemarks("");
                setShowCancelApprovedModal(true);
              }}
              disabled={!!actionLoading}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 dark:bg-rose-950/60 dark:hover:bg-rose-600 dark:text-rose-300 dark:hover:text-white dark:border-rose-900/60 font-bold text-xs rounded-xl shadow-2xs transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              title="Cancel this approved venue reservation"
            >
              <Ban size={13} />
              <span>Cancel Booking</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleAction(selected.id, "ongoing")}
            disabled={!!actionLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all duration-150 cursor-pointer"
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
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : isOngoing ? (
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {!isInspectionReady && (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-200 text-xs font-semibold shadow-2xs"
              title={inspectionEligibility.reason}
            >
              <Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Inspection opens {inspectionEligibility.unlockTimeStr ? `at ${inspectionEligibility.unlockTimeStr}` : "30 mins before end time"}</span>
              {inspectionEligibility.minutesUntilUnlock > 0 && (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  ({inspectionEligibility.minutesUntilUnlock > 60
                    ? `${Math.floor(inspectionEligibility.minutesUntilUnlock / 60)}h ${inspectionEligibility.minutesUntilUnlock % 60}m`
                    : `${inspectionEligibility.minutesUntilUnlock}m`})
                </span>
              )}
            </div>
          )}

          {!isInspectionReady && (
            <button
              type="button"
              onClick={() => setShowEarlyReturnModal(true)}
              disabled={!!actionLoading}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 dark:bg-blue-950/60 dark:hover:bg-blue-600 dark:text-blue-300 dark:hover:text-white dark:border-blue-900/60 font-extrabold text-xs rounded-xl shadow-2xs transition-all duration-150 cursor-pointer flex items-center gap-1.5"
              title="Conclude event early and return equipment for post-event inspection"
            >
              <PackageCheck size={14} />
              <span>Conclude & Return Equipment</span>
            </button>
          )}

          {isSuperAdmin && !inspectionEligibility.isReady && !adminEarlyOverride && (
            <button
              type="button"
              onClick={() => setShowEarlyOverrideModal(true)}
              className="px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Super Administrator Early Inspection Override"
            >
              <ShieldCheck size={13} className="text-amber-700 dark:text-amber-300" />
              <span>Admin Override</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleAction(selected.id, "post-inspection", adminEarlyOverride ? { force: true } : {})}
            disabled={!isInspectionReady || !!actionLoading}
            title={!isInspectionReady ? inspectionEligibility.reason : "Start Post-Event Inspection"}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all duration-150 cursor-pointer"
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
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : isPostInspection ? (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRequestComplete || handleDoneComplete}
            disabled={!!actionLoading || savingInspection || hasInspectionChanges}
            title={hasInspectionChanges ? "Save the inspection record before completing this reservation" : undefined}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all duration-150 cursor-pointer"
          >
            {actionLoading === `${selected.id}-complete` || actionLoading === "complete" ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Completing...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Complete</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setSelected(null); setShowRejectForm(false); }}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer"
        >
          Close
        </button>
      )}
    </div>

    {/* Early Inspection Override Confirmation Modal */}
    <ConfirmModal
      open={showEarlyOverrideModal}
      onClose={() => setShowEarlyOverrideModal(false)}
      onConfirm={() => {
        setAdminEarlyOverride(true);
        setShowEarlyOverrideModal(false);
      }}
      variant="shield"
      title="Early Inspection Override"
      message="Event schedule has not yet reached the 30-minute pre-end inspection window. As Super Administrator, do you want to override and start early post-event inspection now?"
      confirmLabel="Override & Proceed"
      cancelLabel="Cancel"
    />

    {/* Cancel Approved Venue Booking Confirmation Modal */}
    <ConfirmModal
      open={showCancelApprovedModal}
      onClose={() => setShowCancelApprovedModal(false)}
      onConfirm={async () => {
        const finalRemarks = cancelRemarks.trim() || "Approved venue booking cancelled by administrator";
        setShowCancelApprovedModal(false);
        await handleAction(selected?.id, "cancel", { remarks: finalRemarks, rejection_reason: finalRemarks });
      }}
      variant="danger"
      title="Cancel Approved Venue Reservation"
      message="Are you sure you want to cancel this approved venue booking? The reservation will be cancelled, any reserved equipment units will be released back to inventory, and an update notice will be dispatched."
      confirmLabel="Yes, Cancel Booking"
      cancelLabel="Keep Reservation"
      loading={actionLoading === `${selected?.id}-cancel`}
    >
      <div className="space-y-1.5 mt-1">
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
          Cancellation Reason (Optional)
        </label>
        <textarea
          rows={2}
          value={cancelRemarks}
          onChange={(e) => setCancelRemarks(e.target.value)}
          placeholder="e.g., Event cancelled by organizing department..."
          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-rose-500"
        />
      </div>
    </ConfirmModal>

    {/* Early Return / Conclude Event Confirmation Modal */}
    <ConfirmModal
      open={showEarlyReturnModal}
      onClose={() => setShowEarlyReturnModal(false)}
      onConfirm={async () => {
        setShowEarlyReturnModal(false);
        await handleAction(selected?.id, "post-inspection", { early_return: true, force: true });
      }}
      variant="primary"
      title="Conclude Event & Start Post-Inspection"
      message={`Has the event in "${selected?.venue_name || selected?.venue?.name || 'the venue'}" concluded and all assigned equipment been retrieved for physical condition inspection?`}
      confirmLabel="Yes, Start Post-Inspection"
      cancelLabel="Cancel"
    />
    </>
  );
}
