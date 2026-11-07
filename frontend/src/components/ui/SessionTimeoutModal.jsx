import { Clock } from "lucide-react";

/**
 * Inactivity warning. Shows ONE countdown (the number + a draining bar),
 * never the same seconds twice.
 */
export default function SessionTimeoutModal({
  isOpen,
  secondsRemaining,
  totalSeconds = 60,
  onStayLoggedIn,
  onLogout,
}) {
  if (!isOpen) return null;

  const safeSeconds = Math.max(0, secondsRemaining);
  const percent = Math.min(100, Math.max(0, (safeSeconds / totalSeconds) * 100));

  return (
    <div
      className="modal-overlay fixed inset-0 z-[9999] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      data-own-escape
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-desc"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <h3 id="session-timeout-title" className="modal-title text-base font-bold text-slate-900 dark:text-white">
              Are you still there?
            </h3>
            <p id="session-timeout-desc" className="text-sm text-slate-600 dark:text-slate-300">
              You&apos;ll be signed out for your security.
            </p>
          </div>
        </div>

        {/* Single countdown */}
        <div className="mt-5" aria-live="polite">
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums">{safeSeconds}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">seconds left</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-[width] duration-1000 ease-linear"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 min-h-[42px] px-4 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
          <button
            type="button"
            autoFocus
            onClick={onStayLoggedIn}
            className="flex-1 min-h-[42px] px-4 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  );
}
