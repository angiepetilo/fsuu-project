import { Bell } from "lucide-react";

export default function SysadNotifDropdown({
  showNotifDropdown,
  setShowNotifDropdown,
  filteredNotifications,
  selectedOffice,
}) {
  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifDropdown(v => !v)}
        className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
        title="Global Notifications"
      >
        <Bell size={18} />
        {filteredNotifications.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white animate-pulse">
            {filteredNotifications.length}
          </span>
        )}
      </button>

      {showNotifDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-xs flex items-center gap-1.5">
                <Bell size={14} className="text-amber-400" />
                SysAd Global Alerts ({selectedOffice})
              </h4>
              <p className="text-[10px] text-slate-400">All campus activities & loan triggers</p>
            </div>
            <span className="text-[9px] font-bold bg-amber-500 px-2 py-0.5 rounded-full text-slate-950">
              {filteredNotifications.length} Active
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
            {filteredNotifications.map((n) => (
              <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    {n.title}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">{n.time}</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-tight">{n.message}</p>
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <span className="font-bold text-slate-500">🏢 {n.office}</span>
                  <span className="font-mono text-blue-600 font-bold">{n.ref}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => setShowNotifDropdown(false)}
              className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Close Panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
