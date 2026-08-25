import { toast as sonnerToast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

/**
 * PlainToast — sleek, clean, minimal notification card.
 * Thin left accent line per type, soft shadow, no emojis.
 */
function PlainToast({ title, description, type = "default" }) {
  const styles = {
    success: {
      accent: "bg-emerald-500",
      icon:   <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-px" />,
    },
    error: {
      accent: "bg-red-500",
      icon:   <XCircle size={15} className="text-red-500 shrink-0 mt-px" />,
    },
    warning: {
      accent: "bg-amber-400",
      icon:   <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-px" />,
    },
    info: {
      accent: "bg-blue-500",
      icon:   <Info size={15} className="text-blue-500 shrink-0 mt-px" />,
    },
    loading: {
      accent: "bg-slate-400",
      icon:   <Loader2 size={15} className="text-slate-500 shrink-0 mt-px animate-spin" />,
    },
    default: {
      accent: "bg-slate-300",
      icon:   null,
    },
  };

  const { accent, icon } = styles[type] || styles.default;

  return (
    <div className="pointer-events-auto flex items-stretch overflow-hidden rounded-xl bg-white shadow-lg border border-slate-200 min-w-[260px] max-w-[340px] font-sans">
      {/* Left accent stripe */}
      <div className={`w-1 shrink-0 ${accent}`} />

      {/* Content */}
      <div className="flex items-start gap-2.5 px-3.5 py-3 flex-1 min-w-0">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-slate-900 leading-snug truncate">
            {title}
          </p>
          {description && (
            <p className="text-[11.5px] text-slate-500 leading-relaxed mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const BASE_OPTS = { duration: 2500 };

export const notify = {
  success: (title, description) =>
    sonnerToast.custom(() => (
      <PlainToast title={title} description={description} type="success" />
    ), BASE_OPTS),

  error: (title, description) =>
    sonnerToast.custom(() => (
      <PlainToast title={title} description={description} type="error" />
    ), BASE_OPTS),

  warning: (title, description) =>
    sonnerToast.custom(() => (
      <PlainToast title={title} description={description} type="warning" />
    ), BASE_OPTS),

  info: (title, description) =>
    sonnerToast.custom(() => (
      <PlainToast title={title} description={description} type="info" />
    ), BASE_OPTS),

  dismiss: (id) => sonnerToast.dismiss(id),

  loading: (title, description) =>
    sonnerToast.custom(() => (
      <PlainToast title={title} description={description} type="loading" />
    ), { duration: Infinity }),
};

export default notify;
