import { X, AlertTriangle, LogOut, Archive, Ban, CheckCircle2 } from "lucide-react";

const ICONS = {
  archive:  { icon: Archive,       bg: "bg-amber-50 dark:bg-amber-500/15",  border: "border-amber-200 dark:border-amber-500/30", color: "text-amber-600 dark:text-amber-400",  btn: "bg-amber-600 hover:bg-amber-700 text-white" },
  logout:   { icon: LogOut,        bg: "bg-rose-50 dark:bg-rose-500/15",    border: "border-rose-200 dark:border-rose-500/30",   color: "text-rose-600 dark:text-rose-400",    btn: "bg-rose-600 hover:bg-rose-700 text-white"     },
  disable:  { icon: Ban,           bg: "bg-rose-50 dark:bg-rose-500/15",    border: "border-rose-200 dark:border-rose-500/30",   color: "text-rose-600 dark:text-rose-400",    btn: "bg-rose-600 hover:bg-rose-700 text-white"     },
  delete:   { icon: Ban,           bg: "bg-rose-50 dark:bg-rose-500/15",    border: "border-rose-200 dark:border-rose-500/30",   color: "text-rose-600 dark:text-rose-400",    btn: "bg-rose-600 hover:bg-rose-700 text-white"     },
  save:     { icon: CheckCircle2,  bg: "bg-blue-50 dark:bg-blue-500/15",   border: "border-blue-200 dark:border-blue-500/30",  color: "text-blue-600 dark:text-blue-400",   btn: "bg-blue-600 hover:bg-blue-700 text-white"   },
  warning:  { icon: AlertTriangle, bg: "bg-amber-50 dark:bg-amber-500/15",  border: "border-amber-200 dark:border-amber-500/30", color: "text-amber-600 dark:text-amber-400",  btn: "bg-amber-600 hover:bg-amber-700 text-white" },
};

/**
 * Reusable institutional confirmation modal.
 */
export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  variant = "warning",
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
}) {
  if (!open) return null;

  const { icon: Icon, bg, border, color, btn } = ICONS[variant] || ICONS.warning;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={!loading ? onClose : undefined}
      />

      {/* Card */}
      <div className="relative bg-card text-foreground rounded-2xl shadow-xl border border-border w-full max-w-sm p-6 sm:p-7 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Close */}
        {!loading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        )}

        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4 mx-auto`}>
          <Icon size={22} className={color} />
        </div>

        {/* Heading & Content */}
        <div className="text-center">
          <h2 className="text-base font-bold text-foreground tracking-tight mb-1.5">{title}</h2>

          {/* Message */}
          {message && (
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">{message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 min-h-[44px] border border-border text-foreground text-xs font-semibold rounded-lg hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 min-h-[44px] ${btn} text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-60 flex items-center justify-center gap-1.5`}
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
