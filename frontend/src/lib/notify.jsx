import { toast as sonnerToast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const ACCENT = {
  success: { bar: "bg-emerald-500", icon: "text-emerald-500" },
  error:   { bar: "bg-rose-500",    icon: "text-rose-500"    },
  warning: { bar: "bg-amber-500",   icon: "text-amber-500"   },
  info:    { bar: "bg-blue-500",    icon: "text-blue-500"    },
};

const ICON = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

/**
 * PlainToast — slim, flat, no overlay.
 * Auto-dismisses via sonner duration. No ESC needed.
 * Dismiss X appears on hover only.
 */
function PlainToast({ t, type = "info", title, description }) {
  const accent = ACCENT[type] ?? ACCENT.info;
  const Icon   = ICON[type]   ?? ICON.info;

  return (
    <div className="group/toast relative flex items-start gap-3 bg-white rounded-lg shadow-md border border-slate-100 overflow-hidden min-w-[280px] max-w-[380px] pr-8 pl-3 py-2.5">
      {/* Thin left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accent.bar}`} />

      {/* Icon */}
      <Icon size={15} className={`${accent.icon} shrink-0 mt-0.5`} />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-slate-800 leading-snug">{title}</p>
        {description && (
          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{description}</p>
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
