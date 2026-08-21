import React, { useState, useEffect } from "react";
import { Bell, AlertTriangle, Calendar, Package, Archive, Inbox, Check, CheckCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".notification-bell-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const inboxItems = notifications.filter(n => !readNotifIds.has(n.id) && !n.is_read);
  const archiveItems = notifications.filter(n => readNotifIds.has(n.id) || n.is_read);
  const displayedItems = activeTab === "inbox" ? inboxItems : archiveItems;
  const unreadCount = inboxItems.length;

  const handleItemClick = (n) => {
    if (markAsRead) markAsRead(n.id);
    setIsOpen(false);

    // If it's a damaged unit, lost unit, or policy violation, show the incident modal
    if (n.incident_type === "damaged" || n.incident_type === "lost" || n.incident_type === "policy_violation" || isSuperAdmin) {
      if (onSelectIncident) {
        onSelectIncident(n);
        return;
      }
    }

    // For Admin / Staff venue bookings or equipment borrowings, navigate to the target page
    if (n.url) {
      navigate(n.url, { state: { selectedId: n.target_id, targetType: n.target_type, trk: n.ref } });
    }
  };

  const handleSingleArchive = (e, n) => {
    e.stopPropagation();
    if (markAsRead) markAsRead(n.id);
  };

  const getItemIcon = (n) => {
    const type = n.incident_type || n.target_type;
    if (type === "damaged" || type === "lost" || type === "policy_violation") {
      return (
        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0">
          <AlertTriangle size={15} className="text-amber-600" />
        </div>
      );
    }
    if (type === "venue_booking") {
      return (
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0">
          <Calendar size={15} className="text-blue-600" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/80 flex items-center justify-center shrink-0">
        <Package size={15} className="text-indigo-600" />
      </div>
    );
  };

  return (
    <div className="relative notification-bell-container">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[500px]">
          {/* Header Tabs: Inbox | Archive */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("inbox")}
                className={`flex items-center gap-1.5 pb-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "inbox"
                    ? "border-slate-900 text-slate-900 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Inbox size={14} />
                <span>Inbox</span>
                {inboxItems.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {inboxItems.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("archive")}
                className={`flex items-center gap-1.5 pb-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "archive"
                    ? "border-slate-900 text-slate-900 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Archive size={14} />
                <span>Archive</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* List Content */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-[360px]">
            {displayedItems.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-2.5 text-slate-400">
                  {activeTab === "inbox" ? <Inbox size={18} /> : <Archive size={18} />}
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  {activeTab === "inbox" ? "No new notifications yet" : "No archived notifications"}
                </p>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                  {activeTab === "inbox"
                    ? isSuperAdmin
                      ? "Damaged, lost physical units, and policy violation alerts will appear here."
                      : "Reservations, borrowing requests, and incident alerts will appear here."
                    : "Archived alerts will be stored here."}
                </p>
              </div>
            ) : (
              displayedItems.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className="group flex items-start gap-3 p-3.5 hover:bg-slate-50 transition-colors cursor-pointer relative text-left"
                >
                  {/* Left Type Icon */}
                  {getItemIcon(n)}

                  {/* Message / Title Content */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h5 className="text-xs font-semibold text-slate-900 leading-snug">
                      <span className="font-bold">{n.title}: </span>
                      <span className="font-normal text-slate-700">{n.message}</span>
                    </h5>
                    <div className="flex items-center gap-2 mt-1 text-[10.5px] text-slate-400 font-medium">
                      <span>{n.office || "Main Campus"}</span>
                      {n.ref && <span>• {n.ref}</span>}
                    </div>
                  </div>

                  {/* Right: Date / Time + Hover Archive Action */}
                  <div className="shrink-0 text-right flex flex-col items-end gap-1">
                    <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                      {n.time}
                    </span>
                    {activeTab === "inbox" && (
                      <button
                        type="button"
                        onClick={(e) => handleSingleArchive(e, n)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
                        title="Archive notification"
                      >
                        <Archive size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: Archive All */}
          {activeTab === "inbox" && inboxItems.length > 0 && (
            <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center">
              <button
                type="button"
                onClick={markAllAsRead}
                className="w-full py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer hover:bg-white rounded-lg border border-slate-200 shadow-2xs"
              >
                Archive All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
