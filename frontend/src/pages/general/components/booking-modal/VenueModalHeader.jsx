import { X, Clock } from "lucide-react";
import { OverdueBadge } from "@/components/ui/status-badge";
import { getOverdueMinutes, getInspectionEligibility, formatCountdownDuration, formatTimeLate } from "@/lib/dateTimeUtils";
import { formatDateTime } from "@/lib/dateUtils";

/**
 * VenueModalHeader — Top bar of the booking form modal.
 * Displays: title, tracking number, venue name, filed timestamp, status badge, overdue pill, close button.
 */
export default function VenueModalHeader({
  selected,
  displayStatus,
  setSelected,
  setShowRejectForm,
  formatDateTimeFiled,
}) {
  const currentRawStatus = (displayStatus || selected?.status || selected?.tracking_number?.status || "").toLowerCase();
  const isOngoing = ["ongoing", "on-going"].includes(currentRawStatus);
  const isOngoingOrInSession = ["ongoing", "on-going", "in_use", "in-use", "approved"].includes(currentRawStatus);
  const scheduledEndDate = selected?.reservation_end_date || selected?.date_of_usage || selected?.start_datetime;
  const scheduledEndTime = selected?.time_end || selected?.end_datetime || "17:00";
  const overdueMins = isOngoingOrInSession ? getOverdueMinutes(scheduledEndDate, scheduledEndTime) : 0;
  const inspectionEligibility = isOngoing
    ? getInspectionEligibility(scheduledEndDate, scheduledEndTime, 30)
    : { isReady: true, minutesUntilUnlock: 0, unlockTimeStr: "", reason: "" };

  const isLateReturn = Boolean(selected?.is_late) ||
    selected?.is_late === 1 ||
    selected?.is_late === "1" ||
    selected?.is_late === true ||
    (selected?.timeliness || "").toLowerCase().includes("late") ||
    String(selected?.violation_type || "").toLowerCase().includes("late") ||
    String(selected?.violation || "").toLowerCase().includes("late") ||
    Number(selected?.minutes_late || selected?.inspection?.minutes_late || 0) > 0;

  const minutesLateNum = Number(selected?.minutes_late || selected?.inspection?.minutes_late || 0);

  const getReturnTimeFormatted = () => {
    const raw = selected?.returned_at ||
      selected?.post_inspected_at ||
      selected?.cleared_at ||
      selected?.actual_return_time ||
      selected?.inspection?.inspected_at ||
      selected?.inspection?.created_at ||
      (isLateReturn && ["completed", "returned", "damaged", "lost", "policy violation", "policy breach", "satisfactory"].includes(currentRawStatus) ? selected?.updated_at : null);

    if (!raw) return null;
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return formatDateTime(d);
      }
      return String(raw);
    } catch {
      return String(raw);
    }
  };

  const returnTimeStr = getReturnTimeFormatted();

  return (
    <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-blue-900/50 shrink-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Booking Form</h3>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold space-y-0.5 mt-1">
            <p>
              Track No. :{" "}
              <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                {selected.reference_code || selected.tracking_number?.reference_code || `TRK-AVR${selected.id}`}
              </span>{" "}
              | <span className="text-slate-800 dark:text-slate-200 font-bold">{selected.venue_name || selected.venue?.name || "AVR Facility"}</span>
            </p>
            <p>
              Time and Date Filed :{" "}
              <span className="text-slate-700 dark:text-slate-300 font-bold">{formatDateTimeFiled(selected.created_at)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="font-mono text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                Status:{" "}
                <span
                  className={`font-black ${
                    displayStatus === "Satisfactory" || displayStatus === "approved"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : displayStatus === "ongoing" || displayStatus === "on-going"
                      ? "text-blue-600 dark:text-blue-400"
                      : displayStatus === "Completed" || displayStatus === "completed"
                      ? "text-slate-800 dark:text-slate-200"
                      : displayStatus === "Policy Violation" || displayStatus === "Policy Breach" || displayStatus === "damaged" || displayStatus === "rejected"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {displayStatus}
                </span>
              </span>
              {overdueMins > 0 && <OverdueBadge minutesOverdue={overdueMins} />}
            </div>

            {/* Late Return Time Badge below Status */}
            {isLateReturn ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/80 text-amber-800 dark:text-amber-200 text-xs font-bold animate-in fade-in">
                <Clock size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Late Return{returnTimeStr ? `: ${returnTimeStr}` : ""}
                  {minutesLateNum > 0 && formatTimeLate(minutesLateNum) !== "—" ? ` (${formatTimeLate(minutesLateNum)} late)` : ""}
                </span>
              </div>
            ) : returnTimeStr && ["completed", "returned", "cleared", "satisfactory"].includes(currentRawStatus) ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold animate-in fade-in">
                <Clock size={12} className="text-slate-500 shrink-0" />
                <span>Turned Over: {returnTimeStr}</span>
              </div>
            ) : null}

            {/* Inspection opens timer pill displayed below status */}
            {isOngoing && !inspectionEligibility.isReady && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/70 text-amber-800 dark:text-amber-200 text-[11px] font-semibold"
                title={inspectionEligibility.reason}
              >
                <Clock size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Inspection opens {inspectionEligibility.unlockFormattedLabel || (inspectionEligibility.unlockTimeStr ? `${inspectionEligibility.isToday ? 'at ' : ''}${inspectionEligibility.unlockTimeStr}` : "30 mins before end time")}
                </span>
                {inspectionEligibility.minutesUntilUnlock > 0 && (
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    ({inspectionEligibility.countdownDurationStr || (typeof formatCountdownDuration === 'function' ? formatCountdownDuration(inspectionEligibility.minutesUntilUnlock) : `${inspectionEligibility.minutesUntilUnlock}m`)})
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
