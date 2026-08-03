import React from "react";
import { cn } from "@/lib/utils";

/**
 * MetricCard — ZTG-style dashboard stat card.
 *
 * Supports two prop patterns:
 *  1. Admin:  { label, value, badge, badgeType, color, icon }
 *  2. SysAd:  { title, value, subtitle, trend, icon }
 *
 * badgeType: "success" | "warning" | "danger"
 * color:     "blue" | "purple" | "amber" | "rose" | "emerald"
 */
const COLOR_MAP = {
  blue:    { icon: "bg-blue-50 text-blue-600",   badge: "bg-blue-50 text-blue-700 border-blue-200" },
  purple:  { icon: "bg-purple-50 text-purple-600", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  amber:   { icon: "bg-amber-50 text-amber-600",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
  rose:    { icon: "bg-rose-50 text-rose-600",    badge: "bg-rose-50 text-rose-700 border-rose-200" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const BADGE_TYPE_MAP = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger:  "bg-rose-50 text-rose-700 border border-rose-200",
};

export function MetricCard({
  // Admin props
  label,
  badge,
  badgeType = "success",
  color = "blue",
  // SysAd props
  title,
  subtitle,
  trend,
  // Shared
  value,
  icon: Icon,
  className,
}) {
  const displayLabel = label || title || "";
  const displaySub   = badge || subtitle || trend || "";
  const colors       = COLOR_MAP[color] ?? COLOR_MAP.blue;
  const badgeClass   = badge
    ? (BADGE_TYPE_MAP[badgeType] ?? BADGE_TYPE_MAP.success)
    : "text-emerald-600";

  return (
    <div
      className={cn(
        "bg-white rounded-2xl px-5 py-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col gap-3",
        className
      )}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase leading-tight">
          {displayLabel}
        </span>
        {Icon && (
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", colors.icon)}>
            <Icon size={16} />
          </div>
        )}
      </div>

      {/* Large metric value — ZTG style */}
      <div className="text-3xl font-black text-slate-900 tracking-tight leading-none">
        {value ?? "—"}
      </div>

      {/* Badge / subtitle */}
      {displaySub && (
        badge ? (
          <span className={cn("self-start px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", badgeClass)}>
            {displaySub}
          </span>
        ) : (
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
            {trend && <span>▲</span>}
            <span className="text-slate-400 font-medium text-[11px]">{displaySub}</span>
          </div>
        )
      )}
    </div>
  );
}

export function ContentCard({ title, subtitle, action, children, className }) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden",
        className
      )}
    >
      {(title || subtitle || action) && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            {title && (
              <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

export default MetricCard;
