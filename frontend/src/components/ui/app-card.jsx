import React from "react";
import { cn } from "@/lib/utils";

export function MetricCard({ title, value, subtitle, trend, icon: Icon, className }) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between",
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            {title}
          </span>
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Icon size={18} />
            </div>
          )}
        </div>
        <div className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          {trend && <span>▲</span>}
          <span>{subtitle || trend}</span>
        </div>
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
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="font-bold text-slate-900 text-base">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

export default MetricCard;
