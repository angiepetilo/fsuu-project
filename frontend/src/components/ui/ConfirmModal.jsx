import { X, AlertTriangle, LogOut, Archive, Trash2, CheckCircle2 } from "lucide-react";

const ICONS = {
  archive:  { icon: Archive,       bg: "bg-amber-50",  border: "border-amber-200", color: "text-amber-600",  btn: "bg-amber-600 hover:bg-amber-700" },
  logout:   { icon: LogOut,        bg: "bg-red-50",    border: "border-red-200",   color: "text-red-600",    btn: "bg-red-600 hover:bg-red-700"     },
  delete:   { icon: Trash2,        bg: "bg-red-50",    border: "border-red-200",   color: "text-red-600",    btn: "bg-red-600 hover:bg-red-700"     },
  save:     { icon: CheckCircle2,  bg: "bg-blue-50",   border: "border-blue-200",  color: "text-blue-600",   btn: "bg-blue-600 hover:bg-blue-700"   },
  warning:  { icon: AlertTriangle, bg: "bg-amber-50",  border: "border-amber-200", color: "text-amber-600",  btn: "bg-amber-600 hover:bg-amber-700" },
};

/**
 * Reusable confirmation modal.
 *
 * Props:
 *   open        - boolean, whether modal is visible
 *   onClose     - called when user cancels / closes
 *   onConfirm   - called when user confirms
 *   variant     - "archive" | "logout" | "delete" | "save" | "warning"
 *   title       - modal heading
 *   message     - body text (string or JSX)
 *   confirmLabel - button label (default "Confirm")
 *   cancelLabel  - cancel button label (default "Cancel")
 *   loading      - if true, shows spinner on confirm button
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={!loading ? onClose : undefined}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 p-7 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Close */}
        {!loading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        )}

        {/* Icon */}
        <div className={`w-12 h-12 rounded-2xl ${bg} border ${border} flex items-center justify-center mb-4`}>
          <Icon size={22} className={color} />
        </div>

        {/* Heading */}
        <h2 className="text-sm font-black text-slate-900 tracking-tight mb-1">{title}</h2>

        {/* Message */}
        {message && (
          <p className="text-xs text-slate-500 font-medium leading-relaxed">{message}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 ${btn} text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-60 flex items-center justify-center gap-1.5`}
          >
            {loading ? (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
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
