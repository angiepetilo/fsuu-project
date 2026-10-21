import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ClipboardList, Building2, PackageOpen, ClipboardCheck, RefreshCw } from "lucide-react";
import api, { clearApiCache } from "@/lib/axios";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function PendingTasksIndicator({ isSysad = false, basePath: propBasePath }) {
  const location = useLocation();
  const [counts, setCounts] = useState({
    pendingVenue: 0,
    pendingEquip: 0,
    pendingPostVenue: 0,
    pendingPostEquip: 0,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPendingCounts = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      // Clear memory cache so stats are never stale
      clearApiCache();
      const res = await api.get(`/dashboard/stats?_t=${Date.now()}`, { bypassCache: true });
      const data = res.data?.quick_stats || res.data || {};
      
      setCounts({
        pendingVenue: Number(data.pending_venue_count ?? data.pending_bookings ?? data.pending_approval_count ?? data.pendingApproval ?? 0),
        pendingEquip: Number(data.pending_equipment_count ?? data.pending_borrowings ?? data.pending_borrow_count ?? data.pendingEquipBorrowings ?? 0),
        pendingPostVenue: Number(data.post_inspection_pending_venue ?? data.pending_venue_post_inspection ?? 0),
        pendingPostEquip: Number(data.post_inspection_pending_equip ?? data.pending_equip_post_inspection ?? 0),
      });
    } catch {
      // Fallback
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  }, []);

  // Re-fetch instantly on page/route navigation so navigation never shows stale numbers
  useEffect(() => {
    fetchPendingCounts(true);
  }, [location.pathname, location.search, fetchPendingCounts]);

  // Cross-tab real-time sync via storage events (same pings VenueBookings.jsx /
  // EquipmentBorrowings.jsx write after every approve/reject/auto-reject/cancel/undo).
  useEffect(() => {
    const handleStorage = (e) => {
      if (
        e.key === "fsuu_booking_status_updated_ping" ||
        e.key === "fsuu_booking_created_ping" ||
        e.key === "fsuu_realtime_sync_ping"
      ) {
        fetchPendingCounts(true);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchPendingCounts]);

  // Explicitly listen for real-time events across the app
  useRealtimeSync(fetchPendingCounts, {
    interval: 10000,
    customEvents: [
      "venue_bookings_updated",
      "booking_status_updated",
      "equipment_borrowings_updated",
      "equipment_inventory_updated",
      "fsuu_booking_created",
    ],
  });

  const totalPending = counts.pendingVenue + counts.pendingEquip + counts.pendingPostVenue + counts.pendingPostEquip;
  const basePath = propBasePath || (isSysad ? "/sysad" : "/general");

  const handleToggle = () => {
    setIsOpen((prev) => {
      if (!prev) {
        fetchPendingCounts(false);
      }
      return !prev;
    });
  };

  return (
    <div className="relative">
      {/* Flat Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        title="Pending Bookings, Borrowings & Post Inspections"
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-none cursor-pointer"
      >
        <ClipboardList size={14} className="text-slate-500 dark:text-slate-400" />
        <span className="hidden md:inline">Tasks</span>
        {totalPending > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-xs font-sans font-bold bg-amber-500 text-white leading-none shadow-xs">
            {totalPending}
          </span>
        )}
      </button>

      {/* Flat Popover Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg z-50 p-2.5 space-y-1 animate-in fade-in duration-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-100 dark:border-slate-800 px-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Pending Actions
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fetchPendingCounts(false)}
                  disabled={isRefreshing}
                  title="Invalidate cache and refresh tasks"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
                </button>
                <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {totalPending} Total
                </span>
              </div>
            </div>

            {/* Action Rows */}
            <div className="space-y-1 text-xs">
              <Link
                to={`${basePath}/venue-bookings?status=pending`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors font-medium"
              >
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-slate-500 dark:text-slate-400" />
                  <span>Pending Venue Bookings</span>
                </div>
                <span className={`text-xs font-sans font-bold px-2 py-0.5 rounded-md ${
                  counts.pendingVenue > 0 
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200" 
                    : "text-slate-400 dark:text-slate-500"
                }`}>
                  {counts.pendingVenue}
                </span>
              </Link>

              <Link
                to={`${basePath}/equipment-borrowing?status=pending`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors font-medium"
              >
                <div className="flex items-center gap-2">
                  <PackageOpen size={15} className="text-slate-500 dark:text-slate-400" />
                  <span>Pending Borrowings</span>
                </div>
                <span className={`text-xs font-sans font-bold px-2 py-0.5 rounded-md ${
                  counts.pendingEquip > 0 
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200" 
                    : "text-slate-400 dark:text-slate-500"
                }`}>
                  {counts.pendingEquip}
                </span>
              </Link>

              <Link
                to={`${basePath}/venue-bookings?status=on_going`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors font-medium"
              >
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={15} className="text-slate-500 dark:text-slate-400" />
                  <span>Post Venue Inspection</span>
                </div>
                <span className={`text-xs font-sans font-bold px-2 py-0.5 rounded-md ${
                  counts.pendingPostVenue > 0 
                    ? "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200" 
                    : "text-slate-400 dark:text-slate-500"
                }`}>
                  {counts.pendingPostVenue}
                </span>
              </Link>

              <Link
                to={`${basePath}/equipment-borrowing?status=borrowed`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors font-medium"
              >
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={15} className="text-slate-500 dark:text-slate-400" />
                  <span>Post Equipment Inspection</span>
                </div>
                <span className={`text-xs font-sans font-bold px-2 py-0.5 rounded-md ${
                  counts.pendingPostEquip > 0 
                    ? "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200" 
                    : "text-slate-400 dark:text-slate-500"
                }`}>
                  {counts.pendingPostEquip}
                </span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
