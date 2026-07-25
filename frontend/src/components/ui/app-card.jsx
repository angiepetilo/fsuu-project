import * as React from "react";

export function AppCard({ className = "", children, ...props }) {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AppCardIcon({ icon: Icon, color = "blue", className = "", ...props }) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    amber: "bg-amber-50 border-amber-100 text-amber-600",
    purple: "bg-purple-50 border-purple-100 text-purple-600",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    slate: "bg-slate-50 border-slate-200 text-slate-600",
  };

  const colorClasses = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${colorClasses} ${className}`}
      {...props}
    >
      {Icon && <Icon size={20} className="stroke-[2]" />}
    </div>
  );
}
