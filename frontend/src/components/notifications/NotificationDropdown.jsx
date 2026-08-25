import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = "fsuu_archived_notifications";

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
        className="relative p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
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

                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`group flex items-start gap-3 p-4 transition-colors cursor-pointer relative text-left ${
                      activeTab === "inbox" && !isRead
                        ? "bg-blue-50/30 hover:bg-blue-50/60"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Unread indicator dot */}
                    <div className="pt-1 shrink-0">
                      <span
                        className={`w-2 h-2 rounded-full block ${
                          activeTab === "inbox" && !isRead ? "bg-blue-600" : "bg-slate-200"
                        }`}
                      />
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className={`text-xs leading-snug truncate ${!isRead ? "font-extrabold text-slate-900" : "font-semibold text-slate-800"}`}>
                          {n.title}
                        </h5>
                        <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap shrink-0">
                          {n.time}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-normal mt-0.5 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[10.5px]">
                        <span className="text-slate-500 font-medium">{n.office || "Main Campus"}</span>
                        {n.ref && <span className="font-mono text-blue-600 font-bold">• {n.ref}</span>}
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
