import { Bell, AlertTriangle } from "lucide-react";

export default function SysadNotifDropdown({
  showNotifDropdown,
  setShowNotifDropdown,
  filteredNotifications = [],
  selectedOffice = "All Offices",
}) {
  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifDropdown(v => !v)}
        className="relative p-2.5 rounded-full border border-slate-200/80 bg-white/90 backdrop-blur-md text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center"
        title="Notifications"
      >
        <Bell size={18} />
        {filteredNotifications.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse">
            {filteredNotifications.length}
          </span>
        )}
      </button>

      {showNotifDropdown && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-200/90 shadow-2xl z-50 p-4 animate-in zoom-in-95 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-amber-500" />
              <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">System Alerts & Notifications</span>
            </div>
            <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              {selectedOffice}
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 text-xs pr-0.5">
            {filteredNotifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                No active notifications for {selectedOffice}.
              </div>
            ) : (
              filteredNotifications.map((notif, idx) => (
                <div key={idx} className="p-3 bg-slate-50/80 hover:bg-slate-100/80 rounded-2xl border border-slate-200/60 transition-all flex items-start gap-2.5">
                  <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 mt-0.5 shrink-0">
                    <AlertTriangle size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-900 leading-tight">
                      {notif.title || notif.message || "System Alert"}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {notif.details || notif.office || "Notice for Super Admin"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

