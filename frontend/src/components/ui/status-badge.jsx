import React from 'react';

const STATUS_COLORS = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  approved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  ongoing:   "bg-blue-50 text-blue-700 border-blue-200",
  ready:     "bg-cyan-50 text-cyan-700 border-cyan-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  completed: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export function StatusBadge({ status, className = "" }) {
  const normalized = status?.toLowerCase() ?? "pending";
  const style = STATUS_COLORS[normalized] ?? "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize border ${style} ${className}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}
