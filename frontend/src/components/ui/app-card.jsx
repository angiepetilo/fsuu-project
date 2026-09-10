import React from "react";
import { cn } from "@/lib/utils";

/**
 * MetricCard — Institutional University Design System Stat Card.
 *
 * Inter typography, semantic tokens, high contrast in Light and Dark mode.
 */
const COLOR_MAP = {
  blue:    { icon: "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-400", value: "text-foreground" },
  purple:  { icon: "border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-300", value: "text-foreground" },
  amber:   { icon: "border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400", value: "text-amber-600 dark:text-amber-400" },
  rose:    { icon: "border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-400", value: "text-rose-600 dark:text-rose-400" },
  emerald: { icon: "border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400", value: "text-emerald-600 dark:text-emerald-400" },
};

const PLAIN_TEXT_STATUS_MAP = {
  success: "text-emerald-600 dark:text-emerald-400 font-medium",
  warning: "text-amber-600 dark:text-amber-400 font-medium",
  danger:  "text-rose-600 dark:text-rose-400 font-medium",
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

  const isAlert = color === "amber" || color === "rose";
  const numValue = typeof value === "number" ? value : parseInt(value, 10);
  const valueColorClass = (isAlert && numValue > 0) ? colors.value : "text-foreground";

  return (
    <div
      className={cn(
        "bg-card rounded-xl px-5 py-4 border border-border shadow-xs flex flex-col justify-between space-y-2 transition-colors",
        className
      )}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-2 border-b border-border/70 pb-2">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase leading-tight">
          {displayLabel}
        </span>
        {Icon && (
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs", colors.icon)}>
            <Icon size={14} />
          </div>
        )}
      </div>

      {/* Large metric value */}
      <div className={cn("text-2xl sm:text-3xl font-bold tracking-tight leading-none py-1", valueColorClass)}>
        {value ?? "0"}
      </div>

      {/* Plain text status / subtitle */}
      {displaySub && (
        <div className="pt-1 text-xs tracking-wide">
          <span className={statusColor}>● {displaySub}</span>
        </div>
      )}
    </div>
  );
}

export function ContentCard({ title, subtitle, children, className, headerAction }) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-5 shadow-xs space-y-4 transition-colors", className)}>
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div>
            {title && <h3 className="font-semibold text-foreground text-sm sm:text-base tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-muted-foreground font-medium mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default ContentCard;
