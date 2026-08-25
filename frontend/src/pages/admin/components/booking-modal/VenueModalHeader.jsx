import { X } from "lucide-react";
import { OverdueBadge } from "@/components/ui/status-badge";
import { getOverdueMinutes } from "@/lib/dateTimeUtils";

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
  const isOngoingOrInSession = ["ongoing", "on-going", "in_use", "in-use", "approved"].includes(currentRawStatus);
  const scheduledEndDate = selected?.reservation_end_date || selected?.date_of_usage || selected?.start_datetime;
  const overdueMins = isOngoingOrInSession ? getOverdueMinutes(scheduledEndDate, selected?.time_end || selected?.end_datetime) : 0;

  return (
    <div className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Booking Form</h3>
          <div className="text-xs text-slate-500 font-semibold space-y-0.5 mt-1">
            <p>
              Track No. :{" "}
              <span className="font-mono text-slate-800 font-bold">
                {selected.reference_code || selected.tracking_number?.reference_code || `TRK-AVR${selected.id}`}
              </span>{" "}
              | <span className="text-slate-800 font-bold">{selected.venue_name || selected.venue?.name || "AVR Facility"}</span>
            </p>
            <p>
              Time and Date Filed :{" "}
              <span className="text-slate-700 font-bold">{formatDateTimeFiled(selected.created_at)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="font-mono text-xs font-bold uppercase text-slate-500">
              Status:{" "}
              <span
                className={`font-black ${
                  displayStatus === "Satisfactory" || displayStatus === "approved"
                    ? "text-emerald-600"
                    : displayStatus === "ongoing" || displayStatus === "on-going"
                    ? "text-blue-600"
                    : displayStatus === "Completed" || displayStatus === "completed"
                    ? "text-slate-800"
                    : displayStatus === "Policy Breach" || displayStatus === "damaged" || displayStatus === "rejected"
                    ? "text-rose-600"
                    : "text-amber-600"
                }`}
              >
                {displayStatus}
              </span>
            </span>
            {overdueMins > 0 && <OverdueBadge minutesOverdue={overdueMins} />}
          </div>
          <button
            type="button"
            onClick={() => { setSelected(null); setShowRejectForm(false); }}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
