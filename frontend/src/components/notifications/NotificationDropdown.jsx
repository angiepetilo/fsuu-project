import React, { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, AlertCircle, ShieldAlert, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = "fsuu_archived_notifications";

// Incident rows (damaged/lost/violation) use the inspection id as target_id; the real booking/borrowing id is record_id.
const INCIDENT_TARGETS = ["damaged_unit", "lost_unit", "policy_violation", "late_return"];
const getRecordId = (n) => n.record_id ?? n.booking_id ?? n.borrowing_id ?? n.equipment_borrowing_id ?? n.equipment_borrow_id ?? n.venue_booking_id ?? (INCIDENT_TARGETS.includes(n.target_type) ? null : n.target_id);

const getNotificationColorConfig = (n) => {
  const incType = String(n.incident_type || n.target_type || n.type || "").toLowerCase();
  const notifType = String(n.type || "").toLowerCase();
  const title = String(n.title || "").toLowerCase();
  const msg = String(n.message || "").toLowerCase();

  // 1. Post-Event / Equipment Return Inspection Needed (reminders when time passed)
  if (
    notifType === "overdue_post_inspection" ||
    title.includes("inspection needed") ||
    title.includes("inspection pending") ||
    msg.includes("inspection has not been completed") ||
    msg.includes("check-in inspection is pending")
  ) {
    return {
      border: "border-l-4 border-l-amber-500",
      bgUnread: "bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/20 dark:hover:bg-amber-950/35",
      badgeBg: "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-extrabold",
      badgeText: "NEEDS INSPECTION",
      iconBg: "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400",
      dot: "bg-amber-600 dark:bg-amber-500",
      Icon: Clock,
    };
  }

  // 2. Urgent / Unassigned Units Alert
  if (
    notifType === "unassigned_units_warning" ||
    title.includes("unassigned") ||
    title.includes("urgent") ||
    incType.includes("urgent") ||
    msg.includes("urgent")
  ) {
    return {
      border: "border-l-4 border-l-orange-500",
      bgUnread: "bg-orange-50/50 hover:bg-orange-50/80 dark:bg-orange-950/20 dark:hover:bg-orange-950/35",
      badgeBg: "bg-orange-100 dark:bg-orange-950/70 text-orange-900 dark:text-orange-300 border-orange-300 dark:border-orange-800 font-black",
      badgeText: "UNASSIGNED UNITS",
      iconBg: "bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-400",
      dot: "bg-orange-600 dark:bg-orange-500",
      Icon: AlertTriangle,
    };
  }

  // 3. Damaged Physical Unit / Damage Incident
  if (incType.includes("damage") || notifType.includes("damage") || title.includes("damage") || msg.includes("damaged")) {
    return {
      border: "border-l-4 border-l-rose-500",
      bgUnread: "bg-rose-50/40 hover:bg-rose-50/70 dark:bg-rose-950/20 dark:hover:bg-rose-950/35",
      badgeBg: "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      badgeText: "DAMAGED",
      iconBg: "bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400",
      dot: "bg-rose-600 dark:bg-rose-500",
      Icon: AlertTriangle,
    };
  }

  // 4. Lost Physical Unit / Missing
  if (incType.includes("lost") || notifType.includes("lost") || title.includes("lost") || msg.includes("lost") || title.includes("missing")) {
    return {
      border: "border-l-4 border-l-amber-500",
      bgUnread: "bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/20 dark:hover:bg-amber-950/35",
      badgeBg: "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      badgeText: "LOST",
      iconBg: "bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400",
      dot: "bg-amber-600 dark:bg-amber-500",
      Icon: AlertCircle,
    };
  }

  // 5. Policy Violation / Facility Rule Breach
  if (incType.includes("violation") || notifType.includes("violation") || title.includes("violation") || msg.includes("violation") || title.includes("breach")) {
    return {
      border: "border-l-4 border-l-purple-500",
      bgUnread: "bg-purple-50/40 hover:bg-purple-50/70 dark:bg-purple-950/20 dark:hover:bg-purple-950/35",
      badgeBg: "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      badgeText: "VIOLATION",
      iconBg: "bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400",
      dot: "bg-purple-600 dark:bg-purple-500",
      Icon: ShieldAlert,
    };
  }

  // 6. Overdue / Late Return
  if (incType.includes("late") || title.includes("late") || msg.includes("late") || title.includes("overdue") || msg.includes("overdue")) {
    return {
      border: "border-l-4 border-l-orange-500",
      bgUnread: "bg-orange-50/40 hover:bg-orange-50/70 dark:bg-orange-950/20 dark:hover:bg-orange-950/35",
      badgeBg: "bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      badgeText: incType.includes("late_return") ? "LATE RETURN" : "OVERDUE",
      iconBg: "bg-orange-100 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400",
      dot: "bg-orange-600 dark:bg-orange-500",
      Icon: Clock,
    };
  }

  // 7. Student Assistant Category Request
  if (notifType === "student_assistant_request" || title.includes("category request") || incType.includes("request")) {
    return {
      border: "border-l-4 border-l-indigo-500",
      bgUnread: "bg-indigo-50/40 hover:bg-indigo-50/70 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/35",
      badgeBg: "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      badgeText: "REQUEST",
      iconBg: "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400",
      dot: "bg-indigo-600 dark:bg-indigo-500",
      Icon: Bell,
    };
  }

  // 8. New Pending Venue Booking or Equipment Borrowing
  if (notifType.includes("pending") || title.includes("new venue booking") || title.includes("new equipment borrow") || title.includes("pending")) {
    return {
      border: "border-l-4 border-l-blue-500",
      bgUnread: "bg-blue-50/30 hover:bg-blue-50/60 dark:bg-blue-950/20 dark:hover:bg-blue-950/35",
      badgeBg: "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      badgeText: "PENDING",
      iconBg: "bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400",
      dot: "bg-blue-600 dark:bg-blue-500",
      Icon: Bell,
    };
  }

  // 9. Truly Approved / Completed (Safe check without false-positives like "not completed")
  const isTrulyApproved = (title.includes("approved") || msg.includes(" approved ")) && !msg.includes("not been") && !title.includes("needed");
  const isTrulyCompleted = (title.includes("completed") || msg.includes("completed successfully")) && !msg.includes("not been") && !msg.includes("has not");
  if (isTrulyApproved || isTrulyCompleted) {
    return {
      border: "border-l-4 border-l-emerald-500",
      bgUnread: "bg-emerald-50/40 hover:bg-emerald-50/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35",
      badgeBg: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      badgeText: isTrulyCompleted ? "COMPLETED" : "APPROVED",
      iconBg: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-600 dark:bg-emerald-500",
      Icon: CheckCircle2,
    };
  }

  // 10. Rejected / Cancelled
  if (title.includes("reject") || msg.includes("reject") || title.includes("cancel") || msg.includes("cancel")) {
    return {
      border: "border-l-4 border-l-rose-500",
      bgUnread: "bg-rose-50/40 hover:bg-rose-50/70 dark:bg-rose-950/20 dark:hover:bg-rose-950/35",
      badgeBg: "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      badgeText: "REJECTED",
      iconBg: "bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400",
      dot: "bg-rose-600 dark:bg-rose-500",
      Icon: XCircle,
    };
  }

  // Default: Notice / Info
  return {
    border: "border-l-4 border-l-blue-500",
    bgUnread: "bg-blue-50/30 hover:bg-blue-50/60 dark:bg-blue-950/20 dark:hover:bg-blue-950/35",
    badgeBg: "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    badgeText: "NOTICE",
    iconBg: "bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400",
    dot: "bg-blue-600 dark:bg-blue-500",
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

  const handleDirectView = (e, n) => {
    e.stopPropagation();
    if (markAsRead) markAsRead(n.id);
    setIsOpen(false);

    const basePath = isSuperAdmin ? "/sysad" : "/general";
    const ref = (n.ref || "").trim();
    const barcode = (n.barcode || n.unit_code || "").trim();

    const isHardwareIncident = n.incident_type === "damaged" || n.incident_type === "lost";
    const targetHighlightBarcode = isHardwareIncident ? barcode : null;

    if (n.url) {
      let navUrl = n.url;
      if (isSuperAdmin && navUrl.startsWith("/general/")) {
        navUrl = navUrl.replace(/^\/general\//, "/sysad/");
      } else if (!isSuperAdmin && navUrl.startsWith("/sysad/")) {
        navUrl = navUrl.replace(/^\/sysad\//, "/general/");
      }
      navigate(navUrl, { state: { selectedId: getRecordId(n), targetType: n.target_type, trk: ref, search: barcode || ref, highlightBarcode: targetHighlightBarcode } });
      return;
    }

    if (isHardwareIncident && barcode && barcode !== "N/A") {
      navigate(`${basePath}/manage-equipments?search=${encodeURIComponent(barcode)}&barcode=${encodeURIComponent(barcode)}`, {
        state: { search: barcode, highlightBarcode: targetHighlightBarcode },
      });
      return;
    }

    if (ref.startsWith("EQ-") || ref.startsWith("TRK-EB") || n.target_type === "equipment_borrow" || n.record_type === "equipment_borrow") {
      navigate(`${basePath}/equipment-borrowing?id=${getRecordId(n) || ""}&trk=${encodeURIComponent(ref)}`, {
        state: { targetRef: ref, search: ref, selectedId: getRecordId(n) },
      });
    } else if (ref.startsWith("VB-") || ref.startsWith("TRK-AVR") || ref.startsWith("TRK-") || n.target_type === "venue_booking" || n.record_type === "venue_booking") {
      navigate(`${basePath}/venue-bookings?id=${getRecordId(n) || ""}&trk=${encodeURIComponent(ref)}`, {
        state: { targetRef: ref, search: ref, selectedId: getRecordId(n) },
      });
    } else if (isHardwareIncident && barcode && barcode !== "N/A") {
      navigate(`${basePath}/manage-equipments?search=${encodeURIComponent(barcode)}&barcode=${encodeURIComponent(barcode)}`, {
        state: { search: barcode, highlightBarcode: targetHighlightBarcode },
      });
    } else {
      navigate(`${basePath}/reports?tab=incidents&search=${encodeURIComponent(ref || barcode || "")}`);
    }
  };

  const handleItemClick = (n) => {
    if (markAsRead) markAsRead(n.id);
    setIsOpen(false);

    const isRealIncident =
      n.incident_type === "damaged" ||
      n.incident_type === "lost" ||
      n.incident_type === "policy_violation" ||
      n.target_type === "damaged_unit" ||
      n.target_type === "lost_unit";

    if (isRealIncident && onSelectIncident) {
      onSelectIncident(n);
      return;
    }

    const basePath = isSuperAdmin ? "/sysad" : "/general";
    const ref = (n.ref || "").trim();
    const barcode = (n.barcode || n.unit_code || "").trim();
    const isHardwareIncident = n.incident_type === "damaged" || n.incident_type === "lost";
    const targetHighlightBarcode = isHardwareIncident ? barcode : null;

    let targetUrl = n.url;
    if (targetUrl) {
      if (isSuperAdmin && targetUrl.startsWith("/general/")) {
        targetUrl = targetUrl.replace(/^\/general\//, "/sysad/");
      } else if (!isSuperAdmin && targetUrl.startsWith("/sysad/")) {
        targetUrl = targetUrl.replace(/^\/sysad\//, "/general/");
      }
    } else if (ref.startsWith("EQ-") || ref.startsWith("TRK-EB") || n.target_type === "equipment_borrow" || n.record_type === "equipment_borrow") {
      targetUrl = `${basePath}/equipment-borrowing?id=${getRecordId(n) || ""}&trk=${encodeURIComponent(ref)}`;
    } else if (ref.startsWith("VB-") || ref.startsWith("TRK-AVR") || ref.startsWith("TRK-") || n.target_type === "venue_booking" || n.record_type === "venue_booking") {
      targetUrl = `${basePath}/venue-bookings?id=${getRecordId(n) || ""}&trk=${encodeURIComponent(ref)}`;
    } else if (barcode && barcode !== "N/A") {
      targetUrl = `${basePath}/manage-equipments?search=${encodeURIComponent(barcode)}&barcode=${encodeURIComponent(barcode)}`;
    }

    if (targetUrl) {
      navigate(targetUrl, {
        state: {
          selectedId: getRecordId(n),
          targetType: n.target_type,
          trk: ref,
          search: barcode || ref,
          highlightBarcode: targetHighlightBarcode,
        },
      });
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
        <div className="absolute right-0 mt-2 w-88 sm:w-[400px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[520px]">
          {/* Header Tabs: Inbox | Archive */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("inbox")}
                className={`flex items-center gap-1.5 pb-2.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "inbox"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold"
                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <span>Inbox</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("archive")}
                className={`flex items-center gap-1.5 pb-2.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "archive"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold"
                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <span>Archive</span>
                {archiveItems.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {archiveItems.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
            >
              <X size={14} />
            </button>
          </div>

          {/* List Content with sleek .scrollbar-hover */}
          <div className="overflow-y-auto scrollbar-hover divide-y divide-slate-100 dark:divide-slate-800/60 flex-1 max-h-[380px]">
            {displayedItems.length === 0 ? (
              <div className="py-12 px-5 text-center">
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {activeTab === "inbox" ? "No notifications in inbox" : "No archived notifications"}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
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
                    className={`group flex items-start gap-3 p-3.5 transition-all cursor-pointer relative text-left border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 ${cfg.border} ${
                      activeTab === "inbox" && !isRead
                        ? cfg.bgUnread
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900"
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
                          <h5 className={`text-xs leading-snug truncate ${!isRead ? "font-extrabold text-slate-900 dark:text-white" : "font-semibold text-slate-800 dark:text-slate-200"}`}>
                            {n.title}
                          </h5>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {n.time}
                          </span>
                          {activeTab === "inbox" && !isRead && (
                            <span className={`w-2 h-2 rounded-full block ${cfg.dot}`} />
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 font-normal mt-1 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10.5px]">
                        {n.ref && <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{n.ref}</span>}
                        {n.person_name && (
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            • {n.person_name}
                          </span>
                        )}
                        {activeTab === "archive" && (
                          <span className="text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                            Auto-purges in {getDaysRemainingInArchive(n.id)}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions on Hover */}
                    <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                      {activeTab === "inbox" ? (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleDirectView(e, n)}
                            className="px-2 py-1 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md transition-colors cursor-pointer"
                            title="Directly view and locate record"
                          >
                            View
                          </button>
                          {!isRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (markAsRead) markAsRead(n.id);
                              }}
                              className="px-2 py-1 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            >
                              Read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleSingleArchive(e, n)}
                            className="px-2 py-1 text-[10px] font-extrabold text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                          >
                            Archive
                          </button>
                        </div>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleDirectView(e, n)}
                            className="px-2 py-1 text-[10.5px] font-black text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRestore(e, n)}
                            className="px-2.5 py-1 text-[10.5px] font-black text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md transition-colors cursor-pointer"
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
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center gap-2">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex-1 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-center"
              >
                Mark all as read
              </button>
              <button
                type="button"
                onClick={handleArchiveAll}
                className="flex-1 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-center"
              >
                Archive All
              </button>
            </div>
          )}

          {activeTab === "archive" && archiveItems.length > 0 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Auto-purges in 30 days
              </span>
              <button
                type="button"
                onClick={handleRestoreAll}
                className="px-3 py-1.5 text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
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
