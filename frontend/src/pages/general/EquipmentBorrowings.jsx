import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import {
  Loader2, RefreshCw, AlertCircle, Eye, PackageOpen, ChevronLeft, ChevronRight,
  Search, Calendar, Filter, ArrowUpDown, X, Clock
} from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";
import { StatusBadge, OverdueBadge } from "@/components/ui/status-badge";
import { formatDate, formatTimeRange12 } from "@/lib/dateUtils";
import { getOverdueMinutes } from "@/lib/dateTimeUtils";

import { usePermissions } from "@/hooks/usePermissions";

const EquipmentBorrowDetailModal = lazy(() => import("./components/EquipmentBorrowDetailModal"));

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getEndOfWeekStr = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = 7 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function EquipmentBorrowings() {
  const { hasPermission } = usePermissions();
  const context = useOutletContext();
  const location = useLocation();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  // Filters & Search
  const initialStatus = new URLSearchParams(location.search).get("status") || "all";
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "borrow_today" | "due_today" | "this_week" | "custom"
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("due_asc"); // "due_asc" | "borrow_asc" | "created_desc"

  if (!hasPermission("equipment_borrowing")) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3 mt-12 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-sm font-extrabold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 font-medium">
          You do not have permission to view or manage Equipment Borrowings.
        </p>
      </div>
    );
  }

  // Detail Modal & Notification Modal State (Decoupled from list array reference)
  const [selectedId, setSelectedId] = useState(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyReason, setNotifyReason] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const selected = borrowings.find((b) => String(b.id) === String(selectedId)) || null;

  const setSelected = (val) => {
    if (!val) {
      setSelectedId(null);
    } else if (val.id) {
      setSelectedId(val.id);
    } else {
      setSelectedId(null);
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const fetchBorrowings = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    setError(null);
    try {
      const res = await api.get("/admin/equipment-borrows");
      const data = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setBorrowings(data);
    } catch {
      setError("Unable to sync equipment borrowings data.");
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchBorrowings();

    const handleLiveSync = () => {
      fetchBorrowings(true);
    };

    window.addEventListener("equipment_inventory_updated", handleLiveSync);
    return () => {
      window.removeEventListener("equipment_inventory_updated", handleLiveSync);
    };
  }, [fetchBorrowings]);

  // Deep-link from notification navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = params.get("id") || location.state?.selectedId;
    const targetRef = params.get("trk") || params.get("ref");
    if ((targetId || targetRef) && borrowings.length > 0) {
      const match = borrowings.find(b => 
        (targetId && String(b.id) === String(targetId)) ||
        (targetRef && (b.reference_code === targetRef || b.tracking_number?.reference_code === targetRef))
      );
      if (match) {
        setSelectedId(match.id);
      }
    }
  }, [location.search, location.state, borrowings]);

  const selectedOfficeId = context?.selectedOfficeId;

  // Active borrowings list for counts
  const activeBorrowings = borrowings.filter(b => {
    const s = (b.status || b.tracking_number?.status || "").toLowerCase();
    return !["completed", "rejected", "cancelled", "damaged", "lost", "late return", "returned late"].includes(s);
  });
  const countPending = activeBorrowings.filter(b => (b.status || "").toLowerCase() === "pending").length;
  const countApproved = activeBorrowings.filter(b => (b.status || "").toLowerCase() === "approved").length;
  const countOngoing = activeBorrowings.filter(b => ["ongoing", "on-going", "released"].includes((b.status || "").toLowerCase())).length;

  // Filter active borrowings (completed/rejected/cancelled transfer directly to History Log)
  const filteredBorrowings = borrowings.filter(b => {
    const s = (b.status || b.tracking_number?.status || "").toLowerCase();
    const notDone = !["completed", "rejected", "cancelled", "damaged", "lost", "late return", "returned late"].includes(s);
    if (!notDone) return false;

    // Status Filter
    if (statusFilter !== "all") {
      if (statusFilter === "pending" && s !== "pending") return false;
      if (statusFilter === "approved" && s !== "approved") return false;
      if (statusFilter === "ongoing" && s !== "ongoing" && s !== "on-going" && s !== "released") return false;
    }

    // Office Scope
    if (selectedOfficeId && selectedOfficeId !== "all") {
      const offId = b.office_id || b.office?.id || b.items?.[0]?.equipment_type?.office_id || b.items?.[0]?.equipmentType?.office_id;
      const offName = b.office?.name || b.office_name || b.items?.[0]?.equipment_type?.office?.name;
      if (offId && String(offId) !== String(selectedOfficeId)) return false;
      if (offName && officeScope && officeScope !== "All Offices" && !offName.toLowerCase().includes(officeScope.toLowerCase())) {
        return false;
      }
    }

    // Date Filter
    const todayStr = getTodayStr();
    const borrowDate = (b.borrow_date || b.date_of_usage || b.date || "").substring(0, 10);
    const dueDate = (b.return_due_date || b.expected_return_date || b.reservation_end_date || borrowDate).substring(0, 10);

    if (dateFilter === "borrow_today") {
      if (borrowDate !== todayStr) return false;
    } else if (dateFilter === "due_today") {
      if (dueDate !== todayStr) return false;
    } else if (dateFilter === "this_week") {
      if (!borrowDate || borrowDate < todayStr || borrowDate > getEndOfWeekStr()) return false;
    } else if (dateFilter === "custom") {
      if (customDateFrom && borrowDate < customDateFrom) return false;
      if (customDateTo && borrowDate > customDateTo) return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const ref = (b.reference_code || b.tracking_number?.reference_code || `EQUIP-REQ-${b.id}`).toLowerCase();
      const borrower = (b.borrower_name || b.filer_name || b.requestor || "").toLowerCase();
      const dept = (b.department || b.program_office || "").toLowerCase();
      const itemsStr = (b.items || []).map(it => it.equipment_type?.name || it.equipment_unit?.name || it.brand || it.model || "").join(" ").toLowerCase();
      const purpose = (b.purpose || "").toLowerCase();
      if (!ref.includes(q) && !borrower.includes(q) && !dept.includes(q) && !itemsStr.includes(q) && !purpose.includes(q)) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === "created_desc") {
      return (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime());
    }
    if (sortBy === "borrow_asc") {
      const dateA = (a.borrow_date || a.date_of_usage || a.date || "").substring(0, 10);
      const dateB = (b.borrow_date || b.date_of_usage || b.date || "").substring(0, 10);
      return dateA.localeCompare(dateB);
    }
    // Default: due_asc (earliest due return first - urgent shift priority)
    const dueA = (a.return_due_date || a.expected_return_date || a.borrow_date || "").substring(0, 10);
    const dueB = (b.return_due_date || b.expected_return_date || b.borrow_date || "").substring(0, 10);
    return dueA.localeCompare(dueB);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredBorrowings.length, statusFilter, dateFilter, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredBorrowings.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBorrowings = filteredBorrowings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleAction = async (id, type, payload = {}) => {
    setActionLoading(id + "-" + type);
    try {
      const dataPayload = { ...payload };
      if (type === "reject" && !dataPayload.remarks) {
        dataPayload.remarks = dataPayload.rejection_reason || dataPayload.reason || "Borrow request rejected by admin";
      }
      const res = await api.post(`/avr-equipment-borrowings/${id}/${type}`, dataPayload);

      const updatedRecord = res.data && typeof res.data === "object" ? res.data : {};
      const statusMap = {
        approve: "approved",
        reject: "rejected",
        cancel: "cancelled",
        ongoing: "on-going",
        complete: "completed"
      };
      const newStatus = statusMap[type] || type;
      const refCode = selected?.reference_code || selected?.tracking_number?.reference_code || `EQ-${id}`;

      if (type === "complete") {
        notify.success("Equipment Returned", `Borrowing request (${refCode}) completed and archived to History Log.`);
        setSelectedId(null); // Close modal automatically on complete!
      } else if (type === "reject") {
        notify.error("Borrow Request Rejected", `Borrowing request (${refCode}) rejected and transferred to History Log.`);
        setSelectedId(null);
      } else if (type === "approve") {
        notify.success("Borrow Request Approved", `Borrowing request (${refCode}) has been approved.`);
      } else if (type === "ongoing") {
        notify.info("Equipment Released", `Items for (${refCode}) marked as released to borrower.`);
      } else {
        notify.success("Status Updated", `Borrowing request (${refCode}) updated to ${newStatus}.`);
      }

      // Patch the specific borrowing record in-place
      setBorrowings((prev) =>
        prev.map((b) => {
          if (String(b.id) === String(id)) {
            const updatedTracking = b.tracking_number
              ? { ...b.tracking_number, status: newStatus }
              : { status: newStatus };
            return {
              ...b,
              ...updatedRecord,
              status: newStatus,
              tracking_number: updatedTracking,
              trackingNumber: updatedTracking,
            };
          }
          return b;
        })
      );
    } catch (err) {
      notify.error("Action Failed", err.response?.data?.message ?? "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendNotification = (item) => {
    if (!notifyReason.trim()) {
      alert("Please enter a notification reason.");
      return;
    }
    showMsg(`Notification sent to admin: ${notifyReason}`);
    setShowNotifyModal(false);
    setNotifyReason("");
  };

  const showMsg = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  if (loading && borrowings.length === 0) return <PageLoader message="Loading Equipment Borrowings..." />;

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex items-center justify-end gap-4">
        <button
          onClick={() => fetchBorrowings(false)}
          disabled={loading || isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-700 hover:text-white hover:border-blue-700 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
        >
          <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
          <span>{isSyncing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
          {feedbackMsg}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold">
          <AlertCircle size={18} />{error}
        </div>
      )}



      {/* Comprehensive Filter & Search Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3.5 shadow-xs">
        {/* Row 1: Status Pills & Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Borrowings", count: activeBorrowings.length },
              { id: "pending", label: "Pending", count: countPending, color: "text-amber-700 bg-amber-50 border-amber-200" },
              { id: "approved", label: "Approved / To Release", count: countApproved, color: "text-blue-700 bg-blue-50 border-blue-200" },
              { id: "ongoing", label: "Released / In Use", count: countOngoing, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/70"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-700"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown size={12} /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="due_asc">Due Date (Most Urgent Return First)</option>
              <option value="borrow_asc">Borrow Date (Soonest First)</option>
              <option value="created_desc">Date Submitted (Newest First)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Search Input & Date Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tracking, borrower, department, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Calendar size={12} /> Date:
            </span>
            {[
              { id: "all", label: "All Dates" },
              { id: "borrow_today", label: "Borrow Today" },
              { id: "due_today", label: "Due Today" },
              { id: "this_week", label: "This Week" },
              { id: "custom", label: "Custom..." },
            ].map(df => (
              <button
                key={df.id}
                type="button"
                onClick={() => setDateFilter(df.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === df.id
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {df.label}
              </button>
            ))}

            {(statusFilter !== "all" || dateFilter !== "all" || searchQuery || customDateFrom || customDateTo) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setDateFilter("all");
                  setSearchQuery("");
                  setCustomDateFrom("");
                  setCustomDateTo("");
                  setSortBy("due_asc");
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline ml-2 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Pickers (conditional) */}
        {dateFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
            <span>From:</span>
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500"
            />
            <span>To:</span>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Table & Mobile Cards Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["#", "Track Number", "Requestor", "Department", "Equipment", "Date", "Time", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading && borrowings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
                      <span className="text-xs font-semibold italic">Loading equipment borrowings...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBorrowings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-semibold">
                    No equipment borrowings found under status filter "{statusFilter}".
                  </td>
                </tr>
              ) : paginatedBorrowings.map((b, idx) => {
                const refCode = b.tracking_number?.reference_code || b.reference_code || `EQUIP-REQ-${b.id}`;
                const requestor = b.filer_name || b.requestor_name || "—";
                const department = b.program_office || b.requestor_program_office || "—";
                const equipment = b.equipment_type?.name || b.equipment_name || b.item_name || "Audio Visual Gear";
                const usageDate = formatDate(b.date_of_usage || b.start_datetime);
                const rawStart = b.time_start || b.start_datetime;
                const rawEnd = b.time_end || b.end_datetime;
                const timeRange = formatTimeRange12(rawStart, rawEnd);
                const currentStatus = b.status || b.tracking_number?.status || "pending";
                const displayIndex = startIndex + idx + 1;
                const isReleasedOrOngoing = ["ongoing", "on-going", "released", "in_use", "in-use", "borrowed"].includes(currentStatus.toLowerCase());
                const overdueMins = isReleasedOrOngoing ? getOverdueMinutes(b.date_of_usage || b.start_datetime, rawEnd) : 0;

                return (
                  <tr key={`eb-row-${b.id}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{displayIndex}</td>
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">{refCode}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{requestor}</td>
                    <td className="px-4 py-3.5 text-slate-700">{department}</td>
                    <td className="px-4 py-3.5 font-bold text-blue-700">{equipment}</td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{usageDate}</td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{timeRange}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={currentStatus} />
                        {overdueMins > 0 && <OverdueBadge minutesOverdue={overdueMins} />}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setSelectedId(b.id)}
                        title="View Details"
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs transition-all cursor-pointer"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading && borrowings.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin mx-auto mb-2" />
              <span className="text-xs font-semibold italic">Loading borrowings...</span>
            </div>
          ) : filteredBorrowings.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-semibold">
              No equipment borrowings found under "{statusFilter}".
            </div>
          ) : (
            paginatedBorrowings.map((b) => {
              const refCode = b.tracking_number?.reference_code || b.reference_code || `EQUIP-REQ-${b.id}`;
              const requestor = b.filer_name || b.requestor_name || "—";
              const department = b.program_office || b.requestor_program_office || "—";
              const equipment = b.equipment_type?.name || b.equipment_name || b.item_name || "Audio Visual Gear";
              const usageDate = formatDate(b.date_of_usage || b.start_datetime);
              const rawStart = b.time_start || b.start_datetime;
              const rawEnd = b.time_end || b.end_datetime;
              const timeRange = formatTimeRange12(rawStart, rawEnd);
              const currentStatus = b.status || b.tracking_number?.status || "pending";
              const isReleasedOrOngoing = ["ongoing", "on-going", "released", "in_use", "in-use", "borrowed"].includes(currentStatus.toLowerCase());
              const overdueMins = isReleasedOrOngoing ? getOverdueMinutes(b.date_of_usage || b.start_datetime, rawEnd) : 0;

              return (
                <div key={`eb-card-${b.id}`} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-blue-600 tracking-tight">{refCode}</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <StatusBadge status={currentStatus} />
                      {overdueMins > 0 && <OverdueBadge minutesOverdue={overdueMins} />}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{requestor}</h4>
                    <p className="text-xs text-slate-500 font-semibold">{department}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1.5 border border-slate-100">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500 font-medium">Equipment:</span>
                      <span className="font-bold text-blue-700">{equipment}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500 font-medium">Schedule:</span>
                      <span className="font-bold text-slate-900">{usageDate} ({timeRange})</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedId(b.id)}
                    className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Eye size={15} />
                    <span>View Borrowing Details</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {filteredBorrowings.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to{" "}
              <span className="font-extrabold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filteredBorrowings.length)}</span> of{" "}
              <span className="font-extrabold text-slate-900">{filteredBorrowings.length}</span> equipment borrowings
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal Sub-Component (Items 16, 17, 35) */}
      <Suspense fallback={null}>
        <EquipmentBorrowDetailModal
          selected={selected}
          setSelected={setSelected}
          formatDate={formatDate}
          showNotifyModal={showNotifyModal}
          setShowNotifyModal={setShowNotifyModal}
          notifyReason={notifyReason}
          setNotifyReason={setNotifyReason}
          handleSendNotification={handleSendNotification}
          handleAction={handleAction}
          actionLoading={actionLoading}
        />
      </Suspense>
    </div>
  );
}
