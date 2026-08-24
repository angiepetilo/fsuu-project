import { toast as sonnerToast } from "sonner";
import { X } from "lucide-react";

/**
 * PlainToast — sleek, clean, minimalist plain notification.
 * - No color accent bar
 * - No gradients
 * - Standard subtle border radius (rounded-lg / 8px)
 * - Crisp text hierarchy
 */
/**
 * PlainToast — sleek, clean, minimalist plain notification.
 * - No close button (auto-dismisses cleanly)
 * - 2-second display duration across all notifications
 * - Crisp text hierarchy & subtle shadow
 */
function PlainToast({ title, description }) {
  return (
    <div className="pointer-events-auto relative flex items-start gap-3 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-200 min-w-[260px] max-w-[360px] px-4 py-3 font-sans transition-all animate-in fade-in zoom-in-95 duration-150">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-900 leading-snug">
          {title}
        </p>
        {description && (
          <p className="text-[12px] text-slate-600 font-normal leading-relaxed mt-0.5">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

const BASE_OPTS = { duration: 2000 };

export const notify = {
  success: (title, description) =>
    sonnerToast.custom((t) => (
      <PlainToast title={title} description={description} />
    ), BASE_OPTS),

  error: (title, description) =>
    sonnerToast.custom((t) => (
      <PlainToast title={title} description={description} />
    ), BASE_OPTS),

  warning: (title, description) =>
    sonnerToast.custom((t) => (
      <PlainToast title={title} description={description} />
    ), BASE_OPTS),

  info: (title, description) =>
    sonnerToast.custom((t) => (
      <PlainToast title={title} description={description} />
    ), BASE_OPTS),

  dismiss: (id) => sonnerToast.dismiss(id),

  loading: (title, description) =>
    sonnerToast.custom((t) => (
      <PlainToast title={title} description={description} />
    ), { duration: Infinity }),
};

export default notify;
