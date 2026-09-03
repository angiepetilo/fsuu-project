import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Building2, PackageOpen, ClipboardCheck, ChevronRight } from "lucide-react";
import api from "@/lib/axios";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function PendingTasksIndicator({ isSysad = false, basePath: propBasePath }) {
  const [counts, setCounts] = useState({
    pendingVenue: 0,
    pendingEquip: 0,
    pendingPostVenue: 0,
    pendingPostEquip: 0,
  });
  const [isOpen, setIsOpen] = useState(false);

  const fetchPendingCounts = async () => {
    try {
      const res = await api.get(`/dashboard/stats?_t=${Date.now()}`);
      const data = res.data?.quick_stats || res.data || {};
      
      setCounts({
        pendingVenue: Number(data.pending_venue_count ?? data.pending_bookings ?? data.pending_approval_count ?? data.pendingApproval ?? 0),
        pendingEquip: Number(data.pending_equipment_count ?? data.pending_borrowings ?? data.pending_borrow_count ?? data.pendingEquipBorrowings ?? 0),
        pendingPostVenue: Number(data.post_inspection_pending_venue ?? data.pending_venue_post_inspection ?? 0),
        pendingPostEquip: Number(data.post_inspection_pending_equip ?? data.pending_equip_post_inspection ?? 0),
      });
    } catch {
      // Fallback
    }
  };

  useRealtimeSync(fetchPendingCounts, { interval: 30000 });

  const totalPending = counts.pendingVenue + counts.pendingEquip + counts.pendingPostVenue + counts.pendingPostEquip;
  const basePath = propBasePath || (isSysad ? "/sysad" : "/general");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Pending Bookings, Borrowings & Post Inspections"
        className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
          totalPending > 0
            ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs"
            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
        }`}
      >
        <ClipboardList size={15} className={totalPending > 0 ? "text-amber-600" : "text-slate-500"} />
        <span className="hidden md:inline">Tasks</span>
        {totalPending > 0 && (
          <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black leading-tight">
            {totalPending}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-3 space-y-2 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Pending Actions
              </span>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {totalPending} Total
              </span>
            </div>

            <div className="space-y-1 text-xs font-semibold">
              <Link
                to={`${basePath}/venue-bookings?status=pending`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-blue-50 text-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-blue-600" />
                  <span>Pending Venue Bookings</span>
                </div>
                <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px]">
                  {counts.pendingVenue}
                </span>
              </Link>

              <Link
                to={`${basePath}/equipment-borrowing?status=pending`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-50 text-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <PackageOpen size={15} className="text-amber-600" />
                  <span>Pending Borrowings</span>
                </div>
                <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px]">
                  {counts.pendingEquip}
                </span>
              </Link>

              <Link
                to={`${basePath}/venue-bookings?status=on_going`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 text-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={15} className="text-purple-600" />
                  <span>Post Venue Inspection</span>
                </div>
                <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px]">
                  {counts.pendingPostVenue}
                </span>
              </Link>

              <Link
                to={`${basePath}/equipment-borrowing?status=borrowed`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50 text-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={15} className="text-emerald-600" />
                  <span>Post Equipment Inspection</span>
                </div>
                <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px]">
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
