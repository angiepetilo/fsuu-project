import { toast as sonnerToast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

/**
 * Plain Toast Component
 * Clean, solid white container, plain icon, no blur overlays or nested rings.
 */
function PlainToast({ t, type, title, description }) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />;
      case "error":
        return <XCircle size={18} className="text-rose-600 shrink-0" />;
      case "warning":
        return <AlertTriangle size={18} className="text-amber-600 shrink-0" />;
      case "info":
      default:
        return <Info size={18} className="text-blue-600 shrink-0" />;
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-lg min-w-[300px] sm:min-w-[340px] max-w-md pointer-events-auto transition-all text-left">
      {/* Icon */}
      <div className="shrink-0 flex items-center justify-center">
        {getIcon()}
      </div>

      {/* Text block */}
      <div className="flex-1 min-w-0 pr-1 text-left">
        <h4 className="font-bold text-slate-900 text-xs tracking-tight leading-tight">
          {title}
        </h4>
        {description && (
          <p className="text-[11.5px] text-slate-500 font-normal leading-tight mt-0.5">
            {description}
          </p>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={() => sonnerToast.dismiss(t)}
        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export const notify = {
  success: (title, description) => {
    return sonnerToast.custom((t) => (
      <PlainToast t={t} type="success" title={title} description={description} />
    ), { duration: 4000 });
  },

  error: (title, description) => {
    return sonnerToast.custom((t) => (
      <PlainToast t={t} type="error" title={title} description={description} />
    ), { duration: 4500 });
  },

  warning: (title, description) => {
    return sonnerToast.custom((t) => (
      <PlainToast t={t} type="warning" title={title} description={description} />
    ), { duration: 4500 });
  },

  info: (title, description) => {
    return sonnerToast.custom((t) => (
      <PlainToast t={t} type="info" title={title} description={description} />
    ), { duration: 4000 });
  },

  dismiss: (id) => sonnerToast.dismiss(id),
};

export default notify;
