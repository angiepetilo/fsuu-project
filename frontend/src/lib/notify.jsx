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
      accent: "bg-amber-400",
      icon:   <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />,
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
      className="pointer-events-auto cursor-pointer flex items-stretch overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200/90 min-w-[320px] max-w-[440px] font-sans select-none hover:shadow-3xl hover:border-slate-300 transition-all ring-1 ring-black/5"
      title="Click to dismiss"
    >
      {/* Left accent stripe */}
      <div className={`w-1.5 shrink-0 ${accent}`} />

      {/* Content */}
      <div className="flex items-start gap-3 px-4 py-3.5 flex-1 min-w-0">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-slate-900 leading-snug">
            {title}
          </p>
          {description && (
            <p className="text-[12px] text-slate-600 leading-relaxed mt-1 break-words">
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

const BASE_DURATION = 3500;

export const notify = {
  success: (title, description) => {
    const parsed = parseArgs(title, description, "Success");
    let tId;
    tId = sonnerToast.custom((id) => (
      <PlainToast id={id || tId} title={parsed.title} description={parsed.description} type="success" />
    ), { duration: BASE_DURATION });
    setTimeout(() => {
      if (tId) sonnerToast.dismiss(tId);
    }, BASE_DURATION + 100);
    return tId;
  },

  error: (title, description) => {
    const parsed = parseArgs(title, description, "Error");
    let tId;
    tId = sonnerToast.custom((id) => (
      <PlainToast id={id || tId} title={parsed.title} description={parsed.description} type="error" />
    ), { duration: 4000 });
    setTimeout(() => {
      if (tId) sonnerToast.dismiss(tId);
    }, 4100);
    return tId;
  },

  warning: (title, description) => {
    const parsed = parseArgs(title, description, "Notice");
    let tId;
    tId = sonnerToast.custom((id) => (
      <PlainToast id={id || tId} title={parsed.title} description={parsed.description} type="warning" />
    ), { duration: 3500 });
    setTimeout(() => {
      if (tId) sonnerToast.dismiss(tId);
    }, 3600);
    return tId;
  },

  info: (title, description) => {
    const parsed = parseArgs(title, description, "Information");
    let tId;
    tId = sonnerToast.custom((id) => (
      <PlainToast id={id || tId} title={parsed.title} description={parsed.description} type="info" />
    ), { duration: BASE_DURATION });
    setTimeout(() => {
      if (tId) sonnerToast.dismiss(tId);
    }, BASE_DURATION + 100);
    return tId;
  },

  dismiss: (id) => sonnerToast.dismiss(id),

  loading: (title, description) => {
    const parsed = parseArgs(title, description, "Please wait");
    return sonnerToast.custom((id) => (
      <PlainToast id={id} title={parsed.title} description={parsed.description} type="loading" />
    ), { duration: Infinity });
  },
};

export default notify;
