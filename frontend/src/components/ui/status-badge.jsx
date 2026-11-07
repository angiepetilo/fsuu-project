import React from "react";
import { cn } from "@/lib/utils";
import { formatOverdueDuration } from "@/lib/dateTimeUtils";

// One tone per meaning. Soft fill + light border + dark text, so the text always
// reads louder than the color around it (same color families as before).
const TONES = {
  success: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  info:    "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
  purple:  "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20",
  violet:  "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20",
  danger:  "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  neutral: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60",
};

const STATUS_TONE = {
  approved: "success", available: "success", active: "success",
  completed: "neutral", unavailable: "neutral", retired: "neutral",
  "built-in": "violet", built_in: "violet",

  pending: "warning", incomplete: "warning", reserved: "warning", under_repair: "warning",

  ongoing: "info", "on-going": "info", borrowed: "info", released: "info", "release / in - use": "info",

  ready_to_claim: "purple", inspection: "purple", "post-inspection": "purple",
  "post-event inspection": "purple", post_inspection: "purple",
  under_maintenance: "purple", maintenance: "purple",

  rejected: "danger", cancelled: "danger", damaged: "danger",
};

// Strong, solid badges kept on purpose for final states.
const SOLID = {
  lost:   "bg-rose-900 text-white border-rose-950 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-500/40",
  solved: "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40",
};

const INSPECTION_KEYS = ["post-inspection", "post-event inspection", "post_inspection", "inspection"];

export function StatusBadge({ status, className, children }) {
  const normalized = status ? String(status).toLowerCase().trim() : "pending";
  const colorClass = SOLID[normalized] || TONES[STATUS_TONE[normalized]] || TONES.neutral;

  let displayLabel = children;
  if (!displayLabel) {
    displayLabel = INSPECTION_KEYS.includes(normalized)
      ? "INSPECTION"
      : status ? String(status).replace(/_/g, " ").toUpperCase() : "UNKNOWN";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide uppercase whitespace-nowrap shrink-0",
        colorClass,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

/**
 * Live overdue badge.
 */
export function OverdueBadge({ minutesOverdue, className }) {
  const text = formatOverdueDuration(minutesOverdue);
  if (!text) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap border",
        TONES.danger,
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
