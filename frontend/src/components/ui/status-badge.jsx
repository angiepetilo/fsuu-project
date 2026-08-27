import React from "react";
import { cn } from "@/lib/utils";
import { formatOverdueDuration } from "@/lib/dateTimeUtils";

const STATUS_CONFIGS = {
  approved:          "bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold hover:bg-emerald-100",
  completed:         "bg-slate-100 text-slate-700 border-slate-300 font-bold hover:bg-slate-200",
  available:         "bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold hover:bg-emerald-100",
  active:            "bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold hover:bg-emerald-100",
  
  pending:           "bg-amber-50 text-amber-700 border-amber-300 font-extrabold hover:bg-amber-100",
  reserved:          "bg-amber-50 text-amber-800 border-amber-300 font-extrabold hover:bg-amber-100",
  ongoing:           "bg-blue-50 text-blue-700 border-blue-300 font-extrabold hover:bg-blue-100",
  "on-going":        "bg-blue-50 text-blue-700 border-blue-300 font-extrabold hover:bg-blue-100",
  borrowed:          "bg-blue-50 text-blue-700 border-blue-300 font-extrabold hover:bg-blue-100",
  released:          "bg-blue-50 text-blue-700 border-blue-300 font-extrabold hover:bg-blue-100",
  "release / in - use": "bg-blue-50 text-blue-700 border-blue-300 font-extrabold hover:bg-blue-100",
  ready_to_claim:    "bg-purple-50 text-purple-700 border-purple-300 font-extrabold hover:bg-purple-100",
  "post-inspection":       "bg-purple-50 text-purple-700 border-purple-300 font-extrabold hover:bg-purple-100",
  "post-event inspection": "bg-purple-50 text-purple-700 border-purple-300 font-extrabold hover:bg-purple-100",
  "post_inspection":       "bg-purple-50 text-purple-700 border-purple-300 font-extrabold hover:bg-purple-100",
  
  under_maintenance: "bg-purple-50 text-purple-700 border-purple-300 font-extrabold hover:bg-purple-100",
  maintenance:       "bg-purple-50 text-purple-700 border-purple-300 font-extrabold hover:bg-purple-100",
  under_repair:      "bg-amber-50 text-amber-700 border-amber-300 font-extrabold hover:bg-amber-100",
  
  rejected:          "bg-rose-50 text-rose-700 border-rose-300 font-extrabold hover:bg-rose-100",
  cancelled:         "bg-slate-100 text-slate-600 border-slate-300 font-medium hover:bg-slate-200",
  damaged:           "bg-rose-100 text-rose-800 border-rose-300 font-extrabold hover:bg-rose-200",
  unavailable:       "bg-slate-100 text-slate-700 border-slate-300 font-extrabold hover:bg-slate-200",
  lost:              "bg-red-900 text-white border-red-950 font-black hover:bg-red-950",
  solved:            "bg-emerald-600 text-white border-emerald-700 font-black hover:bg-emerald-700",
  retired:           "bg-slate-100 text-slate-600 border-slate-300 font-medium hover:bg-slate-200",
};

export function StatusBadge({ status, className, children }) {
  const normalized = status ? String(status).toLowerCase() : "pending";
  const colorClass = STATUS_CONFIGS[normalized] || "bg-slate-100 text-slate-700 border-slate-300";
  const displayLabel = children || (status ? String(status).replace(/_/g, " ").toUpperCase() : "UNKNOWN");

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors tracking-wide uppercase shadow-2xs",
        colorClass,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

/**
 * Sleek, clean, plain, and simple live overdue badge.
 */
export function OverdueBadge({ minutesOverdue, className }) {
  const text = formatOverdueDuration(minutesOverdue);
  if (!text) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs whitespace-nowrap",
        className
      )}
      title={`${minutesOverdue} minutes overdue`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
      <span>{text}</span>
    </span>
  );
}

export default StatusBadge;
