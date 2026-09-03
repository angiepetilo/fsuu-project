import { X, Mail, Loader2, Send } from "lucide-react";
import { OverdueBadge } from "@/components/ui/status-badge";
import { getOverdueMinutes } from "@/lib/dateTimeUtils";

/**
 * EquipBorrowHeader — Top bar of the equipment borrowing modal.
 * Displays: title, tracking number, program office, filed timestamp, inline email/reminder actions, status badge, overdue pill, close button.
 */
export default function EquipBorrowHeader({
  selected,
  currentStatus,
  setSelected,
  setShowNotifyModal,
  formatDateTimeFiled,
  resendLoading,
  resendMsg,
  handleResendEmail,
  smsLoading,
  smsMsg,
  handleSendOverdueSms,
  handleSendReturnReminder,
  isOngoing,
  isApproved,
}) {
  const currentRawStatus = (currentStatus || selected?.status || selected?.tracking_number?.status || "").toLowerCase();
  const isReleasedOrOngoing = ["ongoing", "on-going", "released", "in_use", "in-use", "borrowed"].includes(currentRawStatus);
  const overdueMins = isReleasedOrOngoing ? getOverdueMinutes(selected?.date_of_usage || selected?.start_datetime, selected?.time_end || selected?.end_datetime) : 0;

  return (
    <div className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Borrowing Form</h3>
          <div className="text-xs text-slate-500 font-semibold space-y-1 mt-0.5">
            <p>
              Track No. :{" "}
              <span className="font-mono text-slate-800 font-bold">
                {selected.tracking_number?.reference_code || selected.reference_code || (selected.id ? `EQ-2026-${selected.id}` : "—")}
              </span>{" "}
              |{" "}
              <span className="text-slate-800 font-bold">
                {selected.program_office || selected.requestor_program_office || selected.dept || "FSUU Main (AVR Center)"}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span>
                Time and Date Filed :{" "}
                <span className="text-slate-700 font-bold">{formatDateTimeFiled(selected.created_at)}</span>
              </span>

              {/* Inline Action Buttons to the right of Time and Date Filed */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendLoading}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-300 flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                  title="Resend email confirmation to borrower"
                >
                  {resendLoading ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} className="text-slate-600" />}
                  <span>Resend Email</span>
                </button>

                {(isOngoing || isApproved) && (
                  <div className="relative inline-flex items-center rounded-lg shadow-2xs border border-amber-300 bg-amber-50">
                    <button
                      type="button"
                      onClick={() => handleSendReturnReminder ? handleSendReturnReminder("both") : handleSendOverdueSms()}
                      disabled={smsLoading}
                      className="px-2.5 py-1 text-amber-900 hover:bg-amber-100/90 rounded-l-lg text-[11px] font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                      title="Send return equipment notice to borrower via SMS & Email"
                    >
                      {smsLoading ? <Loader2 size={12} className="animate-spin text-amber-700" /> : <Send size={12} className="text-amber-700" />}
                      <span>Return Equipment (Send via SMS & Email)</span>
                    </button>
                    <div className="flex items-center border-l border-amber-300 divide-x divide-amber-300 text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => handleSendReturnReminder ? handleSendReturnReminder("sms") : handleSendOverdueSms()}
                        disabled={smsLoading}
                        className="px-1.5 py-1 text-amber-800 hover:bg-amber-100 font-bold cursor-pointer disabled:opacity-50"
                        title="Send via SMS only"
                      >
                        SMS
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendReturnReminder ? handleSendReturnReminder("email") : handleSendOverdueSms()}
                        disabled={smsLoading}
                        className="px-1.5 py-1 text-amber-800 hover:bg-amber-100 font-bold rounded-r-lg cursor-pointer disabled:opacity-50"
                        title="Send via Email only"
                      >
                        Email
                      </button>
                    </div>
                  </div>
                )}

                {resendMsg && (
                  <span className="text-[10px] font-mono text-emerald-600 font-bold animate-in fade-in">
                    {resendMsg}
                  </span>
                )}
                {smsMsg && (
                  <span className="text-[10px] font-mono text-amber-700 font-bold animate-in fade-in bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {smsMsg}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="font-mono text-xs font-bold uppercase text-slate-500">
              Status:{" "}
              <span
                className={`font-black ${
                  currentStatus === "approved"
                    ? "text-emerald-600"
                    : currentStatus === "ongoing" || currentStatus === "on-going"
                    ? "text-blue-600"
                    : currentStatus === "completed" || currentStatus === "returned"
                    ? "text-slate-800"
                    : currentStatus === "damaged" || currentStatus === "rejected"
                    ? "text-rose-600"
                    : "text-amber-600"
                }`}
              >
                {currentStatus || selected.status || "pending"}
              </span>
            </span>
            {overdueMins > 0 && <OverdueBadge minutesOverdue={overdueMins} />}
          </div>
          <button
            type="button"
            onClick={() => { setSelected(null); setShowNotifyModal(false); }}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
