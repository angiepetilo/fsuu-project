import { Clock } from "lucide-react";

export default function SessionTimeoutModal({
  isOpen,
  secondsRemaining,
  onStayLoggedIn,
  onLogout,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header + Countdown Pill */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <h3
              id="session-timeout-title"
              className="text-sm font-bold text-slate-900 dark:text-white tracking-tight"
            >
              Session Expiring
            </h3>
          </div>

          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold tabular-nums shrink-0">
            {secondsRemaining}s
          </span>
        </div>

        {/* Concise Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          You&apos;ve been inactive for a while. For your security, you will be signed out in{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
            {secondsRemaining} seconds
          </span>
          .
        </p>

        {/* Actions: Secondary left, Primary right */}
        <div className="pt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
          >
            Log Out
          </button>
          <button
            type="button"
            onClick={onStayLoggedIn}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
