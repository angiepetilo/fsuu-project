import { toast as sonnerToast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

// Accent color map per type (subtle left indicator)
const ACCENT = {
  success: { bar: "bg-emerald-500" },
  error:   { bar: "bg-rose-500"    },
  warning: { bar: "bg-amber-500"   },
  info:    { bar: "bg-blue-500"    },
};

/**
 * PlainToast — minimal, clean plain toast without icons.
 * Auto-dismisses via sonner duration. No ESC needed.
 * Dismiss X appears on hover only.
 */
function PlainToast({ t, type = "info", title, description }) {
  const accent = ACCENT[type] ?? ACCENT.info;

  return (
    <div className="group/toast relative flex items-start gap-2.5 bg-white rounded-xl shadow-md border border-slate-200/80 overflow-hidden min-w-[260px] max-w-[360px] pr-7 pl-4 py-3">
      {/* Thin left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3.5px] ${accent.bar}`} />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-slate-900 leading-snug">{title}</p>
        {description && (
          <p className="text-[11px] text-slate-500 font-normal leading-snug mt-0.5">{description}</p>
        )}
      </div>

      {/* Dismiss — appears on hover */}
      <button
        type="button"
        onClick={() => sonnerToast.dismiss(t)}
        className="absolute top-2 right-2 p-0.5 rounded text-slate-300 opacity-0 group-hover/toast:opacity-100 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
        title="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}

const BASE_OPTS = { duration: 3500 };

export const notify = {
  success: (title, description) =>
    sonnerToast.custom((t) => (
      <PlainToast t={t} type="success" title={title} description={description} />
    ), BASE_OPTS),

  error: (title, description) =>
    sonnerToast.custom((t) => (
      <PlainToast t={t} type="error" title={title} description={description} />
    ), { duration: 5000 }),

  warning: (title, description) =>
    sonnerToast.custom((t) => (
      <PlainToast t={t} type="warning" title={title} description={description} />
    ), { duration: 4500 }),

  info: (title, description) =>
    sonnerToast.custom((t) => (
      <PlainToast t={t} type="info" title={title} description={description} />
    ), BASE_OPTS),

  dismiss: (id) => sonnerToast.dismiss(id),

  /**
   * Optimistic loading toast — stays until dismissed manually.
   * Usage: const id = notify.loading("Saving..."); later: notify.dismiss(id);
   */
  loading: (title, description) =>
    sonnerToast.custom((t) => (
      <PlainToast t={t} type="info" title={title} description={description} />
    ), { duration: Infinity }),
};

export default notify;
