import React, { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, AlertCircle, ShieldAlert, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = "fsuu_archived_notifications";

const getNotificationColorConfig = (n) => {
  const incType = String(n.incident_type || n.target_type || n.type || "").toLowerCase();
  const title = String(n.title || "").toLowerCase();
  const msg = String(n.message || "").toLowerCase();

  // 1. Damaged Physical Unit / Damage Incident
  if (incType.includes("damage") || title.includes("damage") || msg.includes("damaged")) {
    return {
      border: "border-l-4 border-l-rose-500",
      bgUnread: "bg-rose-50/40 hover:bg-rose-50/70",
      badgeBg: "bg-rose-100 text-rose-700 border-rose-200",
      badgeText: "DAMAGED",
      iconBg: "bg-rose-100 text-rose-600",
      dot: "bg-rose-600",
      Icon: AlertTriangle,
    };
  }

  // 2. Lost Physical Unit / Missing
  if (incType.includes("lost") || title.includes("lost") || msg.includes("lost") || title.includes("missing")) {
    return {
      border: "border-l-4 border-l-amber-500",
      bgUnread: "bg-amber-50/40 hover:bg-amber-50/70",
      badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
      badgeText: "LOST",
      iconBg: "bg-amber-100 text-amber-600",
      dot: "bg-amber-600",
      Icon: AlertCircle,
    };
  }

  // 3. Policy Violation / Facility Rule Breach
  if (incType.includes("violation") || title.includes("violation") || msg.includes("violation") || title.includes("breach")) {
    return {
      border: "border-l-4 border-l-purple-500",
      bgUnread: "bg-purple-50/40 hover:bg-purple-50/70",
      badgeBg: "bg-purple-100 text-purple-700 border-purple-200",
      badgeText: "VIOLATION",
      iconBg: "bg-purple-100 text-purple-600",
      dot: "bg-purple-600",
      Icon: ShieldAlert,
    };
  }

  // 4. Overdue / Late Return
  if (incType.includes("late") || title.includes("late") || msg.includes("late") || title.includes("overdue") || msg.includes("overdue")) {
    return {
      border: "border-l-4 border-l-orange-500",
      bgUnread: "bg-orange-50/40 hover:bg-orange-50/70",
      badgeBg: "bg-orange-100 text-orange-800 border-orange-200",
      badgeText: "OVERDUE",
      iconBg: "bg-orange-100 text-orange-600",
      dot: "bg-orange-600",
      Icon: Clock,
    };
  }

  // 5. Approved / Completed
  if (title.includes("approved") || msg.includes("approved") || title.includes("complete") || msg.includes("complete")) {
    return {
      border: "border-l-4 border-l-emerald-500",
      bgUnread: "bg-emerald-50/40 hover:bg-emerald-50/70",
      badgeBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
      badgeText: "APPROVED",
      iconBg: "bg-emerald-100 text-emerald-600",
      dot: "bg-emerald-600",
      Icon: CheckCircle2,
    };
  }

  // 6. Rejected / Cancelled
  if (title.includes("reject") || msg.includes("reject") || title.includes("cancel") || msg.includes("cancel")) {
    return {
      border: "border-l-4 border-l-rose-500",
      bgUnread: "bg-rose-50/40 hover:bg-rose-50/70",
      badgeBg: "bg-rose-100 text-rose-700 border-rose-200",
      badgeText: "REJECTED",
      iconBg: "bg-rose-100 text-rose-600",
      dot: "bg-rose-600",
      Icon: XCircle,
    };
  }

  // Default: Pending / Info
  return {
    border: "border-l-4 border-l-blue-500",
    bgUnread: "bg-blue-50/30 hover:bg-blue-50/60",
    badgeBg: "bg-blue-100 text-blue-700 border-blue-200",
    badgeText: "PENDING",
    iconBg: "bg-blue-100 text-blue-600",
    dot: "bg-blue-600",
    Icon: Bell,
  };
};

export default function NotificationDropdown({
  notifications = [],
  readNotifIds = new Set(),
  markAsRead,
  markAllAsRead,
  onSelectIncident,
  isSuperAdmin = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("inbox"); // "inbox" | "archive"
  const navigate = useNavigate();

  // Map of archived notification IDs to archive timestamp: { [id]: timestamp }
  const [archivedMap, setArchivedMap] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const cleaned = {};
      const now = Date.now();
      
      // Auto-purge items older than 30 days
      if (typeof saved === "object" && saved !== null) {
        Object.entries(saved).forEach(([id, timestamp]) => {
          const ts = typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
          if (now - ts < THIRTY_DAYS_MS) {
            cleaned[id] = ts;
          }
        });
      }
      return cleaned;
    } catch {
      return {};
    }
  });

  // Save cleaned archive map to localStorage
  const saveArchiveMap = (newMap) => {
    setArchivedMap(newMap);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
    } catch {}
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".notification-bell-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Filter Inbox vs Archive
  const inboxItems = notifications.filter((n) => !archivedMap[n.id]);
  const archiveItems = notifications.filter((n) => Boolean(archivedMap[n.id]));
  const displayedItems = activeTab === "inbox" ? inboxItems : archiveItems;

  // Unread badge count strictly calculates unread items inside Inbox
  const unreadCount = inboxItems.filter((n) => !readNotifIds.has(n.id) && !n.is_read).length;

  const handleItemClick = (n) => {
    if (markAsRead) markAsRead(n.id);
    setIsOpen(false);

    if (n.incident_type === "damaged" || n.incident_type === "lost" || n.incident_type === "policy_violation" || isSuperAdmin) {
      if (onSelectIncident) {
        onSelectIncident(n);
        return;
      }
    }

    if (n.url) {
      navigate(n.url, { state: { selectedId: n.target_id, targetType: n.target_type, trk: n.ref } });
    }
  };

  const handleSingleArchive = (e, n) => {
    e.stopPropagation();
    const updated = { ...archivedMap, [n.id]: Date.now() };
    saveArchiveMap(updated);
  };

  const handleArchiveAll = () => {
    const now = Date.now();
    const updated = { ...archivedMap };
    inboxItems.forEach((n) => {
      updated[n.id] = now;
    });
    saveArchiveMap(updated);
  };

  const handleRestore = (e, n) => {
    e.stopPropagation();
    const updated = { ...archivedMap };
    delete updated[n.id];
    saveArchiveMap(updated);
  };

  const handleRestoreAll = () => {
    saveArchiveMap({});
  };

  const getDaysRemainingInArchive = (notifId) => {
    const ts = archivedMap[notifId];
    if (!ts) return 30;
    const elapsedMs = Date.now() - ts;
    const remainingDays = Math.max(1, Math.ceil((THIRTY_DAYS_MS - elapsedMs) / (1000 * 60 * 60 * 24)));
    return remainingDays;
  };

  return (
    <div className="relative notification-bell-container font-sans">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-88 sm:w-[400px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[520px]">
          {/* Header Tabs: Inbox | Archive */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("inbox")}
                className={`flex items-center gap-1.5 pb-2.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "inbox"
                    ? "border-blue-600 text-blue-600 font-extrabold"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                <span>Inbox</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("archive")}
                className={`flex items-center gap-1.5 pb-2.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "archive"
                    ? "border-blue-600 text-blue-600 font-extrabold"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                <span>Archive</span>
                {archiveItems.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
                    {archiveItems.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer p-1"
            >
              <X size={14} />
            </button>
          </div>

          {/* List Content */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-[380px]">
            {displayedItems.length === 0 ? (
              <div className="py-12 px-5 text-center">
                <p className="text-xs font-extrabold text-slate-700">
                  {activeTab === "inbox" ? "No notifications in inbox" : "No archived notifications"}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {activeTab === "inbox"
                    ? isSuperAdmin
                      ? "Damaged, lost units, and policy violation alerts will appear here."
                      : "Reservation updates, borrowing requests, and notices will appear here."
                    : "Archived alerts stay here and automatically delete after 30 days."}
                </p>
              </div>
            ) : (
              displayedItems.map((n) => {
                const isRead = readNotifIds.has(n.id) || Boolean(n.is_read);
                const cfg = getNotificationColorConfig(n);
                const IconComponent = cfg.Icon;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`group flex items-start gap-3 p-3.5 transition-all cursor-pointer relative text-left border-b border-slate-100 last:border-b-0 ${cfg.border} ${
                      activeTab === "inbox" && !isRead
                        ? cfg.bgUnread
                        : "hover:bg-slate-50/80 bg-white"
                    }`}
                  >
                    {/* Color-coded Icon Box */}
                    <div className="pt-0.5 shrink-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.iconBg} shadow-2xs`}>
                        <IconComponent size={16} />
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 ${cfg.badgeBg}`}>
                            {cfg.badgeText}
                          </span>
                          <h5 className={`text-xs leading-snug truncate ${!isRead ? "font-extrabold text-slate-900" : "font-semibold text-slate-800"}`}>
                            {n.title}
                          </h5>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10.5px] font-medium text-slate-400 whitespace-nowrap">
                            {n.time}
                          </span>
                          {activeTab === "inbox" && !isRead && (
                            <span className={`w-2 h-2 rounded-full block ${cfg.dot}`} />
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 font-normal mt-1 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10.5px]">
                        {n.ref && <span className="font-mono text-blue-600 font-bold">{n.ref}</span>}
                        {n.person_name && (
                          <span className="text-slate-500 font-medium">
                            • {n.person_name}
                          </span>
                        )}
                        {activeTab === "archive" && (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            Auto-purges in {getDaysRemainingInArchive(n.id)}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions on Hover */}
                    <div className="shrink-0 flex items-center gap-2 pt-0.5">
                      {activeTab === "inbox" ? (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (markAsRead) markAsRead(n.id);
                              }}
                              className="px-2 py-1 text-[10px] font-extrabold text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            >
                              Read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleSingleArchive(e, n)}
                            className="px-2 py-1 text-[10px] font-extrabold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            Archive
                          </button>
                        </div>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleRestore(e, n)}
                            className="px-2.5 py-1 text-[10.5px] font-black text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            Restore
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          {activeTab === "inbox" && inboxItems.length > 0 && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center gap-2">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex-1 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer bg-white hover:bg-slate-50 disabled:hover:bg-white rounded-xl border border-slate-200 shadow-2xs text-center"
              >
                Mark all as read
              </button>
              <button
                type="button"
                onClick={handleArchiveAll}
                className="flex-1 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-2xs text-center"
              >
                Archive All
              </button>
            </div>
          )}

          {activeTab === "archive" && archiveItems.length > 0 && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-medium">
                Auto-purges in 30 days
              </span>
              <button
                type="button"
                onClick={handleRestoreAll}
                className="px-3 py-1.5 text-xs font-black text-blue-600 hover:text-blue-800 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
              >
                Restore All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
