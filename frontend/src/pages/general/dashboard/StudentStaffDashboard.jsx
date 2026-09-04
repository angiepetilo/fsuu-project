import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2, PackageOpen, CalendarCheck, Box, ShieldAlert,
  FileText, RefreshCw, AlertCircle, ArrowUpRight,
  CheckCircle2
} from "lucide-react";

export default function StudentStaffDashboard({
  staffTasks = [],
  staffTaskFilter = "all",
  setStaffTaskFilter,
  loading = false,
  error = null,
  onRefresh,
  isSysadRoute = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const venueCount = staffTasks.filter((t) => t.type === "venue").length;
  const equipCount = staffTasks.filter((t) => t.type === "equipment").length;

  const filteredStaffTasks = staffTasks.filter((t) => {
    const matchesType = staffTaskFilter === "all" || t.type === staffTaskFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesType;
    const matchesSearch =
      (t.tracking_no || "").toLowerCase().includes(q) ||
      (t.borrower || "").toLowerCase().includes(q) ||
      (t.equipment || "").toLowerCase().includes(q) ||
      (t.task || "").toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {error && (
        <div className="py-3 px-4 rounded-2xl border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2.5 bg-rose-50 shadow-2xs">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* QUICK SHIFT ACTIONS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3.5">
        <div>
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Quick Shift Actions
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Walk-in booking terminals and operational shortcuts
          </p>
        </div>

        {/* 1 & 2: HERO ACTION BUTTONS (Walk-in Booking Terminals) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hero 1: Book Venue Interface */}
          <Link
            to="/interface/venue"
            className="group p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                Primary Action 01
              </span>
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5 group-hover:text-blue-600 transition-colors">
                Book Venue Interface
                <ArrowUpRight size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Reserve classrooms and AVRs.
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors ml-3">
              <Building2 size={24} />
            </div>
          </Link>

          {/* Hero 2: Borrow Equipment Interface */}
          <Link
            to="/interface/equipment"
            className="group p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Primary Action 02
              </span>
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5 group-hover:text-emerald-600 transition-colors">
                Borrow Equipment Interface
                <ArrowUpRight size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Borrow AV equipment and accessories.
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors ml-3">
              <PackageOpen size={24} />
            </div>
          </Link>
        </div>

        {/* 3, 4, 5, 6: OPERATIONAL DESK TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Desk 3: Venue Verification */}
          <Link
            to={isSysadRoute ? "/sysad/venue-bookings?status=pending" : "/general/venue-bookings?status=pending"}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-blue-300 transition-all p-4 rounded-2xl flex items-center gap-3.5 group cursor-pointer shadow-2xs hover:shadow-sm"
          >
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CalendarCheck size={20} />
            </div>
            <div className="min-w-0">
              <span className="block font-extrabold text-slate-900 text-xs tracking-tight group-hover:text-blue-700 transition-colors">
                Venue Verification
              </span>
              <span className="block text-[11px] text-slate-500 font-medium mt-0.5">
                Inspect &amp; verify rooms
              </span>
            </div>
          </Link>

          {/* Desk 4: Equipment Release */}
          <Link
            to={isSysadRoute ? "/sysad/equipment-borrowing?status=approved" : "/general/equipment-borrowing?status=approved"}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-emerald-300 transition-all p-4 rounded-2xl flex items-center gap-3.5 group cursor-pointer shadow-2xs hover:shadow-sm"
          >
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Box size={20} />
            </div>
            <div className="min-w-0">
              <span className="block font-extrabold text-slate-900 text-xs tracking-tight group-hover:text-emerald-700 transition-colors">
                Equipment Release
              </span>
              <span className="block text-[11px] text-slate-500 font-medium mt-0.5">
                Handout units &amp; cables
              </span>
            </div>
          </Link>

          {/* Desk 5: Post Inspect */}
          <Link
            to={isSysadRoute ? "/sysad/venue-bookings?status=ongoing" : "/general/venue-bookings?status=ongoing"}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-amber-300 transition-all p-4 rounded-2xl flex items-center gap-3.5 group cursor-pointer shadow-2xs hover:shadow-sm"
          >
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <ShieldAlert size={20} />
            </div>
            <div className="min-w-0">
              <span className="block font-extrabold text-slate-900 text-xs tracking-tight group-hover:text-amber-700 transition-colors">
                Post Inspect
              </span>
              <span className="block text-[11px] text-slate-500 font-medium mt-0.5">
                Return testing &amp; clearance
              </span>
            </div>
          </Link>

          {/* Desk 6: Inventory Check */}
          <Link
            to={isSysadRoute ? "/sysad/manage-equipments" : "/general/manage-equipments"}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-purple-300 transition-all p-4 rounded-2xl flex items-center gap-3.5 group cursor-pointer shadow-2xs hover:shadow-sm"
          >
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <span className="block font-extrabold text-slate-900 text-xs tracking-tight group-hover:text-purple-700 transition-colors">
                Inventory Check
              </span>
              <span className="block text-[11px] text-slate-500 font-medium mt-0.5">
                Physical unit registry
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* PENDING SHIFT TASKS & REQUISITIONS TABLE */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                Today's Pending Shift Tasks
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-700 border border-blue-200">
                {staffTasks.length} Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Latest pending venue bookings and equipment borrow requests requiring student assistant clearance.
            </p>
          </div>

          {/* Filter Type Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setStaffTaskFilter("all")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                staffTaskFilter === "all"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({staffTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setStaffTaskFilter("venue")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                staffTaskFilter === "venue"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Venue ({venueCount})
            </button>
            <button
              type="button"
              onClick={() => setStaffTaskFilter("equipment")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                staffTaskFilter === "equipment"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Equipment ({equipCount})
            </button>
          </div>
        </div>

        {/* Filter / Search Sub-bar */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search tracking no, borrower, venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
            Showing {filteredStaffTasks.length} of {staffTasks.length} tasks
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-100 text-left text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3.5">TYPE</th>
                <th className="py-3 px-3.5">TRACKING NO.</th>
                <th className="py-3 px-3.5">REQUESTOR</th>
                <th className="py-3 px-3.5">FACILITY / ITEM</th>
                <th className="py-3 px-3.5">SCHEDULE TIME</th>
                <th className="py-3 px-3.5">DUTY ACTION</th>
                <th className="py-3 px-3.5 text-right">CLEARANCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {filteredStaffTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="max-w-xs mx-auto space-y-1.5">
                      <CheckCircle2 size={24} className="mx-auto text-emerald-500/80" />
                      <p className="font-bold text-slate-700 text-xs">All Clear for Now!</p>
                      <p className="text-[11px] text-slate-400 font-normal">
                        No pending {staffTaskFilter === "all" ? "" : `${staffTaskFilter} `}shift tasks awaiting action.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaffTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          t.type === "venue"
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900">
                      {t.tracking_no}
                    </td>
                    <td className="py-3.5 px-3.5 font-bold text-slate-900">
                      {t.borrower}
                    </td>
                    <td className="py-3.5 px-3.5 text-slate-800 font-mono">
                      {t.equipment}
                    </td>
                    <td className="py-3.5 px-3.5 text-slate-600 font-mono whitespace-nowrap">
                      {t.time}
                    </td>
                    <td className="py-3.5 px-3.5 text-slate-700">
                      {t.task}
                    </td>
                    <td className="py-3.5 px-3.5 text-right">
                      <Link
                        to={t.link}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-extrabold text-xs bg-slate-900 text-white hover:bg-blue-600 transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>{t.action_label}</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
