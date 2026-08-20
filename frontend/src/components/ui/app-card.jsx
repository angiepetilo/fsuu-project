import React from "react";
import { cn } from "@/lib/utils";

/**
 * MetricCard — Minimalist Senior Design System Stat Card.
 *
 * Plain text status indicator, semantic color accents on active values/icons.
 */
const COLOR_MAP = {
  blue:    { icon: "border border-blue-200 bg-blue-50 text-blue-700", value: "text-slate-900" },
  purple:  { icon: "border border-purple-200 bg-purple-50 text-purple-700", value: "text-slate-900" },
  amber:   { icon: "border border-amber-200 bg-amber-50 text-amber-600", value: "text-amber-600" },
  rose:    { icon: "border border-rose-200 bg-rose-50 text-rose-600", value: "text-rose-600" },
  emerald: { icon: "border border-emerald-200 bg-emerald-50 text-emerald-600", value: "text-emerald-600" },
};

const PLAIN_TEXT_STATUS_MAP = {
  success: "text-emerald-600 font-bold font-mono",
  warning: "text-amber-600 font-bold font-mono",
  danger:  "text-rose-600 font-bold font-mono",
};

export function MetricCard({
  label,
  badge,
  badgeType = "success",
  color = "blue",
  title,
  subtitle,
  trend,
  value,
  icon: Icon,
  className,
}) {
  const displayLabel = label || title || "";
  const displaySub   = badge || subtitle || trend || "";
  const colors       = COLOR_MAP[color] ?? COLOR_MAP.blue;
  const statusColor  = PLAIN_TEXT_STATUS_MAP[badgeType] ?? PLAIN_TEXT_STATUS_MAP.success;

  // Semantic value color: if alert/warning metric is 0, render clean slate-900, else use semantic color
  const isAlert = color === "amber" || color === "rose";
  const numValue = typeof value === "number" ? value : parseInt(value, 10);
  const valueColorClass = (isAlert && numValue > 0) ? colors.value : "text-slate-900";

  return (
    <div
      className={cn(
        "bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-2",
        className
      )}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
        <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase leading-tight font-mono">
          {displayLabel}
        </span>
        {Icon && (
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs", colors.icon)}>
            <Icon size={14} />
          </div>
        )}
      </div>

      {/* Large metric value */}
      <div className={cn("text-2xl sm:text-3xl font-black tracking-tight leading-none font-mono py-1", valueColorClass)}>
        {value ?? "0"}
      </div>

      {/* Plain text status / subtitle */}
      {displaySub && (
        <div className="pt-1 text-[10.5px] uppercase tracking-wide">
          <span className={statusColor}>● {displaySub}</span>
        </div>
      )}
    </div>
  );
}

export function ContentCard({ title, subtitle, children, className, headerAction }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4", className)}>
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            {title && <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 font-semibold mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
