import React from "react";
import { cn } from "@/lib/utils";
import { formatOverdueDuration } from "@/lib/dateTimeUtils";

const STATUS_CONFIGS = {
  approved:          "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  completed:         "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/60",
  available:         "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  active:            "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  
  pending:           "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  reserved:          "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  ongoing:           "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  "on-going":        "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  borrowed:          "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  released:          "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  "release / in - use": "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  ready_to_claim:    "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  "post-inspection":       "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  "post-event inspection": "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  "post_inspection":       "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  
  under_maintenance: "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  maintenance:       "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  under_repair:      "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  
  rejected:          "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
  cancelled:         "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
  damaged:           "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/35",
  unavailable:       "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/60",
  lost:              "bg-rose-900 text-white border-rose-950 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-500/40",
  solved:            "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40",
  retired:           "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/60",
};

export function StatusBadge({ status, className, children }) {
  const normalized = status ? String(status).toLowerCase() : "pending";
  const colorClass = STATUS_CONFIGS[normalized] || "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/60";
  const displayLabel = children || (status ? String(status).replace(/_/g, " ").toUpperCase() : "UNKNOWN");

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors tracking-wide uppercase shadow-2xs",
        colorClass,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

/**
 * Clean, institutional live overdue badge.
 */
export function OverdueBadge({ minutesOverdue, className }) {
  const text = formatOverdueDuration(minutesOverdue);
  if (!text) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs whitespace-nowrap dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
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
