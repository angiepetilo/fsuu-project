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
      </button>

      {showNotifDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-4 animate-in zoom-in-95 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                System Notifications
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
              0 New
            </span>
          </div>

          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            No notifications received for now.
          </div>
        </div>
      )}
    </div>
  );
}
