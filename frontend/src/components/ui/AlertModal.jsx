import { X, AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

const ICONS = {
  error:   { icon: AlertCircle,   bg: "bg-rose-50 dark:bg-rose-500/15",    border: "border-rose-200 dark:border-rose-500/30",    color: "text-rose-600 dark:text-rose-400"    },
  warning: { icon: AlertTriangle, bg: "bg-amber-50 dark:bg-amber-500/15",  border: "border-amber-200 dark:border-amber-500/30",  color: "text-amber-600 dark:text-amber-400"  },
  info:    { icon: Info,          bg: "bg-blue-50 dark:bg-blue-500/15",    border: "border-blue-200 dark:border-blue-500/30",    color: "text-blue-600 dark:text-blue-400"    },
  success: { icon: CheckCircle2,  bg: "bg-emerald-50 dark:bg-emerald-500/15", border: "border-emerald-200 dark:border-emerald-500/30", color: "text-emerald-600 dark:text-emerald-400" },
};

/**
 * AlertModal — flat, in-app replacement for native window.alert().
 * No heavy elevation shadow, just a border + rounded card, matching the
 * app-wide flat design convention (see ConfirmModal / VenueBookingDetailModal).
 */
export default function AlertModal({
  open,
  onClose,
  variant = "error",
  title = "Notice",
  message,
  buttonLabel = "OK",
}) {
  if (!open) return null;

  const { icon: Icon, bg, border, color } = ICONS[variant] || ICONS.error;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6 sm:p-7 z-10 animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className={`w-11 h-11 rounded-xl ${bg} border ${border} flex items-center justify-center mb-3.5`}>
          <Icon size={20} className={color} />
        </div>

        <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-1.5">{title}</h2>

        {message && (
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{message}</p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 min-h-[42px] bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
