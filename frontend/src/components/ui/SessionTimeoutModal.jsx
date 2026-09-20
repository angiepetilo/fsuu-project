import { Clock, ShieldAlert, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SessionTimeoutModal({
  isOpen,
  secondsRemaining,
  onStayLoggedIn,
  onLogout,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto border-4 border-amber-500/20 shadow-inner">
          <Clock size={28} className="animate-pulse" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Session Expiring Soon
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Due to inactivity, your secure session will automatically log out in:
          </p>
        </div>

        {/* Prominent Countdown Badge */}
        <div className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300 font-mono font-black text-2xl tracking-wider shadow-inner">
          <span>{secondsRemaining}</span>
          <span className="text-xs font-sans font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">sec</span>
        </div>

        <p className="text-[11.5px] text-slate-400 dark:text-slate-500">
          Click below if you would like to continue your active work session.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onStayLoggedIn}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>Stay Logged In</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut size={15} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
