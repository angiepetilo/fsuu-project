import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import {
  Loader2, AlertCircle, Eye, Building2, ChevronLeft, ChevronRight,
  Search, Calendar, X, Filter
} from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";
import { StatusBadge, OverdueBadge } from "@/components/ui/status-badge";
import FilterDropdown from "@/components/ui/FilterDropdown";
import { formatDate, formatTime, formatTimeRange, formatDateRange } from "@/lib/dateUtils";
import { getOverdueMinutes } from "@/lib/dateTimeUtils";

import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

const VenueBookingDetailModal = lazy(() => import("./components/VenueBookingDetailModal"));

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getTomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getStartOfWeekStr = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
};

const getEndOfWeekStr = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = 7 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const formatVenueEquipmentTypes = (b) => {
  if (!b) return "-";

  // 1. Structured relation
  const structItems = b.venue_booking_equipment || b.venueBookingEquipment || b.equipment_items;
  if (Array.isArray(structItems) && structItems.length > 0) {
    const list = structItems.map(item => {
      const name = item.equipment_type?.eq_name || item.equipment_type?.name || item.others_specify || item.name;
      const qty = item.quantity_requested || item.quantity;
      if (!name) return null;
      return qty && qty > 1 ? `${name} (${qty})` : name;
    }).filter(Boolean);
    if (list.length > 0) return list.join(", ");
  }

  // 2. equipment_types column (array or string)
  if (b.equipment_types) {
    if (Array.isArray(b.equipment_types) && b.equipment_types.length > 0) {
      return b.equipment_types.filter(Boolean).join(", ");
    }
    if (typeof b.equipment_types === "string" && b.equipment_types.trim()) {
      try {
        const parsed = JSON.parse(b.equipment_types);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(Boolean).join(", ");
      } catch {
        const clean = b.equipment_types.trim();
        if (clean && !["none", "n/a", "no", "—", "-", "null", "undefined"].includes(clean.toLowerCase())) {
          return clean;
        }
      }
    }
  }

  // 3. equipment_notes / equipment_needed_remarks / equipment_remarks
  const rawNotes = b.equipment_notes || b.equipment_needed_remarks || b.equipment_remarks || "";
  if (rawNotes && typeof rawNotes === "string") {
    let clean = rawNotes.trim();
    // Strip leading "Equipment-Needed:" or "Equipment Needed:"
    clean = clean.replace(/^equipment[- ]?needed\s*:\s*/i, "").trim();
    if (clean && !["none", "n/a", "no", "—", "-", "null", "undefined"].includes(clean.toLowerCase())) {
      return clean;
    }
  }

  // 4. Fallback: If assigned_units has barcodes, show count
  const au = b.assigned_units;
  if (au) {
    let barcodes = [];
    if (Array.isArray(au)) barcodes = au.filter(Boolean);
    else if (typeof au === "object" && au !== null) barcodes = Object.values(au).filter(Boolean);
    else if (typeof au === "string") {
      try {
        const p = JSON.parse(au);
        if (Array.isArray(p)) barcodes = p.filter(Boolean);
        else if (typeof p === "object" && p !== null) barcodes = Object.values(p).filter(Boolean);
      } catch {}
    }
    if (barcodes.length > 0) {
      return `${barcodes.length} unit${barcodes.length > 1 ? 's' : ''}`;
    }
  }

  return "-";
};

export default function VenueBookings() {
  const { hasPermission } = usePermissions();
  const context = useOutletContext();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  // Filters & Search
  const initialStatus = new URLSearchParams(location.search).get("status") || "all";
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "today" | "tomorrow" | "this_week" | "custom"
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("event_asc"); // "event_asc" | "created_desc"


  // Detail Modal & Notification Modal State (Decoupled from list array reference)
  const [selectedId, setSelectedId] = useState(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionComments, setRejectionComments] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const selected = bookings.find((b) => String(b.id) === String(selectedId)) || null;

  const setSelected = (val) => {
    if (!val) {
      setSelectedId(null);
    } else if (val.id) {
      setSelectedId(val.id);
    } else {
      setSelectedId(null);
    }
  };

  const [inspectionStatus, setInspectionStatus] = useState("clean");
  const [evidencePhoto, setEvidencePhoto] = useState(null);
  const [violationNotes, setViolationNotes] = useState("");
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyReason, setNotifyReason] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchBookings = useCallback(async (opts = false) => {
    if (!hasPermission("venue_bookings")) {
      setLoading(false);
      return;
    }
    const isSilent = typeof opts === "object" && opts !== null
      ? Boolean(opts.isSilent || opts.silent || opts.showLoading === false)
      : Boolean(opts);

    if (!isSilent) setIsSyncing(true);
    setError(null);
    try {
      const res = await api.get("/avr-venue-bookings");
      const data = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setBookings(data);
    } catch {
      if (!isSilent) setError("Unable to sync venue bookings data.");
    } finally {
      setLoading(false);
      if (!isSilent) setIsSyncing(false);
    }
  }, []);

  useRealtimeSync(fetchBookings, {
    interval: 8000,
    customEvents: [
      "venue_bookings_updated",
      "booking_status_updated",
      "equipment_inventory_updated",
      "fsuu_booking_created",
    ],
  });

  // Cross-tab real-time sync via storage events
  useEffect(() => {
    const handleStorage = (e) => {
      if (
        e.key === "fsuu_booking_status_updated_ping" ||
        e.key === "fsuu_booking_created_ping" ||
        e.key === "fsuu_realtime_sync_ping"
      ) {
        fetchBookings(true);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchBookings]);

  // Deep-link from notification navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = params.get("id") || location.state?.selectedId;
    const targetRef = params.get("trk") || params.get("ref");
    const paramStatus = params.get("status");
    if (paramStatus && ["pending", "approved", "ongoing", "incomplete"].includes(paramStatus)) {
      setStatusFilter(paramStatus);
    }
    if ((targetId || targetRef) && bookings.length > 0) {
      const match = bookings.find(b => 
        (targetId && String(b.id) === String(targetId)) ||
        (targetRef && (b.reference_code === targetRef || b.tracking_number?.reference_code === targetRef))
      );
      if (match) {
        setSelectedId(match.id);
      }
    }
  }, [location.search, location.state, bookings]);

  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";
  const selectedOfficeId = context?.selectedOfficeId;

  // Active bookings list and counts memoized
  const { activeBookings, countPending, countIncomplete, countApproved, countOngoing } = useMemo(() => {
    const active = bookings.filter(b => {
      const s = (b.status || b.tracking_number?.status || "").toLowerCase();
      return s !== "completed" && s !== "damaged" && s !== "solved" && s !== "rejected" && s !== "cancelled";
    });
    return {
      activeBookings: active,
      countPending: active.filter(b => ["pending", "incomplete"].includes((b.status || b.tracking_number?.status || "").toLowerCase())).length,
      countIncomplete: active.filter(b => (b.status || b.tracking_number?.status || "").toLowerCase() === "incomplete").length,
      countApproved: active.filter(b => (b.status || b.tracking_number?.status || "").toLowerCase() === "approved").length,
      countOngoing: active.filter(b => ["ongoing", "on-going"].includes((b.status || b.tracking_number?.status || "").toLowerCase())).length,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const s = (b.status || b.tracking_number?.status || "").toLowerCase();
      const notDone = s !== "completed" && s !== "damaged" && s !== "solved" && s !== "rejected" && s !== "cancelled";
      if (!notDone) return false;

      // Status Filter (Pending review includes both pending and incomplete requests awaiting documents)
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && s !== "pending" && s !== "incomplete") return false;
        if (statusFilter === "incomplete" && s !== "incomplete") return false;
        if (statusFilter === "approved" && s !== "approved") return false;
        if (statusFilter === "ongoing" && s !== "ongoing" && s !== "on-going") return false;
      }

      // Office Scope
      if (selectedOfficeId && selectedOfficeId !== "all") {
        const offId = b.venue?.office_id || b.office_id || b.office?.id;
        const offName = b.venue?.office?.name || b.office?.name || b.office_name;
        if (offId && String(offId) !== String(selectedOfficeId)) return false;
        if (offName && officeScope && officeScope !== "All Offices" && !offName.toLowerCase().includes(officeScope.toLowerCase())) {
          return false;
        }
      }

      // Date Filter
      const eventDate = (b.date_of_usage || b.date_of_use || b.date || "").substring(0, 10);
      const todayStr = getTodayStr();
      if (dateFilter === "today") {
        if (eventDate !== todayStr) return false;
      } else if (dateFilter === "this_week") {
        const startOfWeek = getStartOfWeekStr();
        const endOfWeek = getEndOfWeekStr();
        if (!eventDate || eventDate < startOfWeek || eventDate > endOfWeek) return false;
      } else if (dateFilter === "this_month") {
        const currentYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        if (!eventDate || !eventDate.startsWith(currentYearMonth)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ref = (b.reference_code || b.tracking_number?.reference_code || `TRK-AVR${b.id}`).toLowerCase();
        const filer = (b.filer_name || b.requestor || "").toLowerCase();
        const dept = (b.program_office || b.department || "").toLowerCase();
        const vName = (b.venue?.name || b.venue_name || "").toLowerCase();
        const purpose = (b.purpose || "").toLowerCase();
        const eqTypes = formatVenueEquipmentTypes(b).toLowerCase();
        if (!ref.includes(q) && !filer.includes(q) && !dept.includes(q) && !vName.includes(q) && !purpose.includes(q) && !eqTypes.includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "created_desc") {
        return (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime());
      }
      // Default: event_asc (earliest upcoming event first)
      const dateA = `${(a.date_of_usage || a.date_of_use || "").substring(0, 10)} ${a.time_start || ""}`;
      const dateB = `${(b.date_of_usage || b.date_of_use || "").substring(0, 10)} ${b.time_start || ""}`;
      return dateA.localeCompare(dateB);
    });
  }, [bookings, statusFilter, selectedOfficeId, officeScope, dateFilter, searchQuery, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter, searchQuery, sortBy]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)), [filteredBookings.length]);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBookings = useMemo(() => {
    return filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBookings, startIndex]);

  const handleAction = async (bookingId, action, customData = {}) => {
    setActionLoading(`${bookingId}-${action}`);
    try {
      let endpoint = `/avr-venue-bookings/${bookingId}/${action}`;
      const payload = { ...customData };
      if (action === "reject") {
        const comment = customData.remarks || customData.rejection_reason || rejectionComments || "Venue reservation rejected by admin";
        payload.remarks = comment;
        payload.rejection_reason = comment;
      }
      const res = await api.post(endpoint, payload);

      const updatedRecord = res.data && typeof res.data === "object" ? res.data : {};
      const statusMap = {
        approve: "approved",
        ongoing: "on-going",
        complete: "completed",
        reject: "rejected",
        cancel: "cancelled",
        "mark-incomplete": "incomplete",
      };
      const newStatus = statusMap[action] || action;
      const refCode = selected?.reference_code || selected?.tracking_number?.reference_code || `TRK-AVR${bookingId}`;
      const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

      if (action === "complete") {
        notify.success("Reservation Completed", `Venue booking (${refCode}) transferred to History Log.`);
        setSelectedId(null);
        setShowRejectForm(false);
      } else if (action === "reject") {
        notify.error("Reservation Rejected", `Venue booking (${refCode}) rejected and transferred to History Log.`);
        setSelectedId(null);
        setShowRejectForm(false);
      } else if (action === "cancel") {
        notify.warning("Reservation Cancelled", `Venue booking (${refCode}) cancelled and transferred to History Log.`);
        setSelectedId(null);
        setShowRejectForm(false);
      } else if (action === "mark-incomplete") {
        notify.warning("Marked Incomplete", `Venue booking (${refCode}) marked incomplete. Alert email sent with 24-48h deadline.`);
      } else if (action === "approve") {
        notify.success("Reservation Approved", `Venue booking (${refCode}) has been approved.`);
      } else if (action === "ongoing") {
        notify.info("Event Started", `[${refCode}] Started at ${timeNow}`);
      } else if (action === "post-inspection") {
        notify.info("Post-Event Inspection", `[${refCode}] Ready for post-event verification.`);
      } else {
        notify.success("Status Updated", `Venue booking (${refCode}) updated to ${newStatus}.`);
      }

      // Patch the specific venue booking record in-place
      setBookings((prev) =>
        prev.map((b) => {
          if (String(b.id) === String(bookingId)) {
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

      // Invalidate cache and broadcast real-time sync across components and tabs
      fetchBookings(true);
      window.dispatchEvent(new Event("venue_bookings_updated"));
      window.dispatchEvent(new Event("booking_status_updated"));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      try {
        localStorage.setItem("fsuu_booking_status_updated_ping", JSON.stringify({
          type: "venue_booking",
          id: bookingId,
          status: newStatus,
          timestamp: Date.now()
        }));
      } catch {}
    } catch (err) {
      notify.error("Action Failed", err.response?.data?.message ?? "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  if (!hasPermission("venue_bookings")) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3 mt-12 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-sm font-extrabold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 font-medium">
          You do not have permission to view or manage Venue Bookings.
        </p>
      </div>
    );
  }

  if (loading && bookings.length === 0) return <PageLoader message="Loading Venue Bookings..." />;

  return (
    <div className="space-y-6">

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold">
          <AlertCircle size={18} />{error}
        </div>
      )}

      {/* Search & Status Controls Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tracking, requestor, department, venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter (Capped at 5 visible items with scroll) */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <FilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "pending", label: "Pending Review" },
                { value: "incomplete", label: "Incomplete" },
                { value: "approved", label: "Approved" },
                { value: "ongoing", label: "Ongoing" },
              ]}
              icon={Filter}
              title="Filter by Booking Status"
            />
            {(statusFilter !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline ml-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table & Mobile Cards Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["#", "Track Number", "Requestor", "Department", "Venue", "Equipment Types", "Date", "Time", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading && bookings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                      <span className="text-xs font-semibold italic">Loading venue bookings...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-semibold">
                    No venue bookings found.
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b, idx) => {
                  const refCode = b.tracking_number?.reference_code || b.reference_code || `TRK-AVR${b.id}`;
                  const requestor = b.filer_name || b.requestor_name || "—";
                  const department = b.program_office || b.department || "—";
                  const venueName = b.venue?.name || b.venue_name || "AVR Auditorium";
                  const usageDate = formatDateRange(b.date_of_usage || b.start_datetime, b.reservation_end_date);
                  const timeRange = formatTimeRange(b.time_start, b.time_end);
                  const currentStatus = b.status || b.tracking_number?.status || "pending";
                  const displayIndex = startIndex + idx + 1;
                  const isOngoingOrInSession = ["ongoing", "on-going", "in_use", "in-use", "approved"].includes(currentStatus.toLowerCase());
                  const scheduledEndDate = b.reservation_end_date || b.date_of_usage || b.start_datetime;
                  const overdueMins = isOngoingOrInSession ? getOverdueMinutes(scheduledEndDate, b.time_end) : 0;
                  const eqTypes = formatVenueEquipmentTypes(b);

                  return (
                    <tr key={`vb-row-${b.id}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-400">{displayIndex}</td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                        {refCode}
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{requestor}</td>
                      <td className="px-4 py-3.5 text-slate-700">{department}</td>
                      <td className="px-4 py-3.5 font-bold text-blue-700">{venueName}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {eqTypes !== "-" ? (
                          <span className="font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200/80 dark:border-blue-800/60 inline-block max-w-[220px] truncate" title={eqTypes}>
                            {eqTypes}
                          </span>
                        ) : (
                          <span className="font-bold text-slate-400">-</span>
                        )}
                      </td>
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
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading && bookings.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin mx-auto mb-2" />
              <span className="text-xs font-semibold italic">Loading venue bookings...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-semibold">
              No venue bookings found.
            </div>
          ) : (
            paginatedBookings.map((b) => {
              const refCode = b.tracking_number?.reference_code || b.reference_code || `TRK-AVR${b.id}`;
              const requestor = b.filer_name || b.requestor_name || "—";
              const department = b.program_office || b.department || "—";
              const venueName = b.venue?.name || b.venue_name || "AVR Auditorium";
              const usageDate = formatDateRange(b.date_of_usage || b.start_datetime, b.reservation_end_date);
              const timeRange = formatTimeRange(b.time_start, b.time_end);
              const currentStatus = b.status || b.tracking_number?.status || "pending";
              const isOngoingOrInSession = ["ongoing", "on-going", "in_use", "in-use", "approved"].includes(currentStatus.toLowerCase());
              const scheduledEndDate = b.reservation_end_date || b.date_of_usage || b.start_datetime;
              const overdueMins = isOngoingOrInSession ? getOverdueMinutes(scheduledEndDate, b.time_end) : 0;
              const eqTypes = formatVenueEquipmentTypes(b);

              return (
                <div key={`vb-card-${b.id}`} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
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
                      <span className="text-slate-500 font-medium">Facility / Room:</span>
                      <span className="font-bold text-blue-700">{venueName}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500 font-medium">Equipment Types:</span>
                      {eqTypes !== "-" ? (
                        <span className="font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-lg border border-blue-200/80 dark:border-blue-800/60 inline-block max-w-[180px] truncate" title={eqTypes}>
                          {eqTypes}
                        </span>
                      ) : (
                        <span className="font-bold text-slate-400">-</span>
                      )}
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
                    <span>View Booking Details</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {filteredBookings.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to{" "}
              <span className="font-extrabold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filteredBookings.length)}</span> of{" "}
              <span className="font-extrabold text-slate-900">{filteredBookings.length}</span> venue bookings
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

      {/* Modal - Items 13, 14 & Item 35 (Clean White Header) */}
      <Suspense fallback={null}>
        <VenueBookingDetailModal
          selected={selected}
          setSelected={setSelected}
          formatDate={formatDate}
          formatTimeRange={formatTimeRange}
          feedbackMessage={feedbackMessage}
          showRejectForm={showRejectForm}
          setShowRejectForm={setShowRejectForm}
          rejectionComments={rejectionComments}
          setRejectionComments={setRejectionComments}
          handleAction={handleAction}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          inspectionStatus={inspectionStatus}
          setInspectionStatus={setInspectionStatus}
          violationNotes={violationNotes}
          setViolationNotes={setViolationNotes}
          evidencePhoto={evidencePhoto}
          setEvidencePhoto={setEvidencePhoto}
          showNotifyModal={showNotifyModal}
          setShowNotifyModal={setShowNotifyModal}
          notifyReason={notifyReason}
          setNotifyReason={setNotifyReason}
        />
      </Suspense>
    </div>
  );
}
