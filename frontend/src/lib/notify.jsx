import { toast as sonnerToast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2, X } from "lucide-react";

/**
 * PlainToast — sleek, clean, high-visibility notification card.
 * Left accent line per type, solid white background, high-elevation shadow.
 */
function PlainToast({ id, title, description, type = "default" }) {
  const styles = {
    success: {
      accent: "bg-emerald-500",
      icon:   <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />,
    },
    error: {
      accent: "bg-rose-500",
      icon:   <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />,
    },
    warning: {
      accent: "bg-amber-500",
      icon:   <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />,
    },
    info: {
      accent: "bg-blue-500",
      icon:   <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />,
    },
    loading: {
      accent: "bg-slate-400",
      icon:   <Loader2 size={16} className="text-slate-500 shrink-0 mt-0.5 animate-spin" />,
    },
    default: {
      accent: "bg-slate-300",
      icon:   null,
    },
  };

  const { accent, icon } = styles[type] || styles.default;

  return (
    <div 
      tabIndex={-1}
      onClick={() => id && sonnerToast.dismiss(id)}
      className="pointer-events-auto cursor-pointer flex items-stretch overflow-hidden rounded-xl bg-white shadow-lg border border-slate-200 w-[min(400px,calc(100vw-2rem))] font-sans select-none hover:border-slate-300 transition-colors"
      title="Click to dismiss"
    >
      {/* Left accent stripe */}
      <div className={`w-1.5 shrink-0 ${accent}`} />

      {/* Content */}
      <div className="flex items-start gap-3 px-4 py-3.5 flex-1 min-w-0">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 leading-snug">
            {title}
          </p>
          {description && (
            <p className="text-[13px] text-slate-600 leading-relaxed mt-0.5 break-words">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (id) sonnerToast.dismiss(id);
          }}
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-0.5 -mr-1 -mt-0.5 rounded-md hover:bg-slate-100"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

const parseArgs = (title, description, fallbackTitle) => {
  if (!description && typeof title === "string") {
    // If only one argument is provided and it's long, use fallbackTitle
    if (title.length > 30) {
      return { title: fallbackTitle, description: title };
    }
    return { title, description: null };
  }
  return { title, description };
};

// Errors and warnings stay longer so people can read what went wrong (click to dismiss earlier)
const DURATIONS = { success: 3500, info: 4000, warning: 6000, error: 7000 };

/**
 * Shows one toast. The same message (type + title + description) reuses one id,
 * so repeated calls refresh the existing toast instead of stacking duplicates.
 */
function show(type, title, description, fallbackTitle) {
  const parsed = parseArgs(title, description, fallbackTitle);
  const key = `${type}|${parsed.title ?? ""}|${parsed.description ?? ""}`;
  return sonnerToast.custom(
    (id) => <PlainToast id={id} title={parsed.title} description={parsed.description} type={type} />,
    { id: key, duration: DURATIONS[type] }
  );
}

export const notify = {
  success: (title, description) => show("success", title, description, "Success"),
  error: (title, description) => show("error", title, description, "Error"),
  warning: (title, description) => show("warning", title, description, "Notice"),
  info: (title, description) => show("info", title, description, "Information"),

  dismiss: (id) => sonnerToast.dismiss(id),

  loading: (title, description) => {
    const parsed = parseArgs(title, description, "Please wait");
    return sonnerToast.custom((id) => (
      <PlainToast id={id} title={parsed.title} description={parsed.description} type="loading" />
    ), { duration: Infinity });
  },
};

export default notify;
