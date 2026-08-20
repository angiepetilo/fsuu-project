import { X } from "lucide-react";

/**
 * EquipBorrowHeader — Top bar of the equipment borrowing modal.
 * Displays: title, tracking number, program office, filed timestamp, status badge, close button.
 */
export default function EquipBorrowHeader({
  selected,
  currentStatus,
  setSelected,
  setShowNotifyModal,
  formatDateTimeFiled,
}) {
  return (
    <div className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Borrowing Form</h3>
          <div className="text-xs text-slate-500 font-semibold space-y-0.5 mt-1">
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
            <p>
              Time and Date Filed :{" "}
              <span className="text-slate-700 font-bold">{formatDateTimeFiled(selected.created_at)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
