import React from "react";
import { Download, Loader2 } from "lucide-react";

/**
 * Clean, Standardized Institutional Export Button
 * Replaces cumbersome split-buttons and dropdown-arrows with an elegant, direct-action trigger.
 */
export default function ExportButton({
  onClick,
  label = "Export",
  count = null,
  loading = false,
  disabled = false,
  variant = "default", // 'default' (white outline) | 'emerald' | 'primary'
  size = "md", // 'sm' | 'md' | 'lg'
  className = "",
  title = "Export data",
}) {
  const baseStyles =
    "inline-flex items-center gap-2 font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none";

  const sizeStyles = {
    sm: "px-3 py-1.5 rounded-lg text-xs",
    md: "px-3.5 py-2 rounded-xl text-xs",
    lg: "px-4.5 py-2.5 rounded-2xl text-sm",
  }[size] || "px-3.5 py-2 rounded-xl text-xs";

  const variantStyles = {
    // Clean neutral style matching image 2
    default:
      "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/90",
    emerald:
      "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-emerald-600/20",
    primary:
      "bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 shadow-blue-600/20",
  }[variant] || variantStyles.default;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin text-current" />
      ) : (
        <Download size={14} className="text-current" />
      )}
      <span>{label}</span>
      {count !== null && (
        <span className="ml-0.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          {count}
        </span>
      )}
    </button>
  );
}
