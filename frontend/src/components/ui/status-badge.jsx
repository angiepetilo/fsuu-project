import React from "react";
import { cn } from "@/lib/utils";

const STATUS_CONFIGS = {
  approved:    "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100",
  completed:   "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100",
  available:   "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100",
  active:      "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100",
  
  pending:     "bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100",
  borrowed:    "bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100",
  under_repair:"bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100",
  
  rejected:    "bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100",
  cancelled:   "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
  damaged:     "bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100",
  retired:     "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
};

export function StatusBadge({ status, className, children }) {
  const normalized = status ? String(status).toLowerCase() : "pending";
  const colorClass = STATUS_CONFIGS[normalized] || "bg-slate-100 text-slate-700 border-slate-200";
  const displayLabel = children || (status ? String(status).replace(/_/g, " ").toUpperCase() : "UNKNOWN");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors tracking-wide uppercase",
        colorClass,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {displayLabel}
    </span>
  );
}

export default StatusBadge;
