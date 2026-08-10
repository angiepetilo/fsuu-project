import { Bell, AlertTriangle, CheckCircle2, Package, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SysadNotifDropdown({
  showNotifDropdown,
  setShowNotifDropdown,
  filteredNotifications = [],
  selectedOffice = "All Offices",
  readNotifIds = new Set(),
  markAsRead,
  markAllAsRead,
}) {
  const navigate = useNavigate();

  const unreadCount = filteredNotifications.filter(n => !readNotifIds.has(n.id)).length;

  const handleClick = (n) => {
    if (markAsRead) markAsRead(n.id);
    setShowNotifDropdown(false);
    if (n.url) {
      navigate(n.url, { state: { selectedId: n.target_id, targetType: n.target_type, trk: n.ref } });
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowNotifDropdown(v => !v)}
        className="relative p-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center justify-center"
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white font-mono font-bold text-[9.5px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-4 animate-in zoom-in-95 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                System Alerts &amp; Notifications
              </span>
            </div>
            <div className="flex items-center gap-2">
              {filteredNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                {unreadCount} Unread
              </span>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 text-xs pr-0.5">
            {filteredNotifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-medium">
                No active notifications for {selectedOffice}.
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isRead = readNotifIds.has(notif.id);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                      isRead
                        ? "bg-white hover:bg-slate-50 border-slate-200/70 opacity-70"
                        : "bg-slate-50 hover:bg-slate-100/80 border-slate-300 shadow-2xs font-bold"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isRead ? "text-slate-600" : "text-slate-900"}`}>
                        <span className={`w-2 h-2 rounded-full ${isRead ? "bg-slate-300" : "bg-blue-600"}`} />
                        {notif.title || "System Alert"}
                      </span>
                      <span className="text-[9.5px] font-mono text-slate-400">{notif.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-tight">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-500">
                      <span>{notif.office || "FSUU"}</span>
                      {notif.ref && (
                        <span className="font-bold text-slate-900 hover:underline">
                          {notif.ref} →
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
