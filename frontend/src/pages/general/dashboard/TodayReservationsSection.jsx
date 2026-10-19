import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatTime } from "@/lib/dateUtils";

export default function TodayReservationsSection({
  venueBookings = [],
  equipBorrowings = [],
  loading = false,
  isSysadRoute = false,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const isItemForToday = (item) => {
    if (!item) return false;
    const rawStart = item.date_of_usage || item.date_of_use || item.booking_date || item.start_datetime || item.date;
    if (!rawStart) return false;
    const start = String(rawStart).substring(0, 10);
    const rawEnd = item.reservation_end_date || item.end_date || item.date_of_usage_end || item.extend_of_date_returned || item.end_datetime || rawStart;
    const end = String(rawEnd).substring(0, 10);

    const status = (item.status || item.tracking_number?.status || "").toLowerCase();
    // Exclude cancelled and rejected bookings from active scheduled reservations
    if (["cancelled", "rejected", "cancelled_by_user"].includes(status)) {
      return false;
    }

    const isOngoing = ["ongoing", "on-going", "post-inspection"].includes(status);

    if (start && end) {
      if (todayStr >= start && todayStr <= end) return true;
    } else if (start === todayStr) {
      return true;
    }

    return isOngoing;
  };

  const todayVenues = useMemo(() => {
    const seen = new Set();
    const result = [];
    (venueBookings || []).filter(isItemForToday).forEach((v) => {
      const key = v.id || v.reference_code || v.tracking_number?.reference_code;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ ...v, itemType: "venue" });
      }
    });
    return result;
  }, [venueBookings, todayStr]);

  const todayEquipment = useMemo(() => {
    const seen = new Set();
    const result = [];
    (equipBorrowings || []).filter(isItemForToday).forEach((e) => {
      const key = e.id || e.reference_code || e.tracking_number?.reference_code;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ ...e, itemType: "equipment" });
      }
    });
    return result;
  }, [equipBorrowings, todayStr]);

  const filteredList = useMemo(() => {
    let list = [];
    if (activeTab === "all" || activeTab === "venues") list = list.concat(todayVenues);
    if (activeTab === "all" || activeTab === "equipment") list = list.concat(todayEquipment);

    // Guaranteed deduplication across merged list
    const seen = new Set();
    const uniqueList = [];
    for (const item of list) {
      const key = `${item.itemType}-${item.id || item.reference_code || item.tracking_number?.reference_code}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueList.push(item);
      }
    }

    if (!searchQuery.trim()) return uniqueList;

    const q = searchQuery.toLowerCase().trim();
    return uniqueList.filter((item) => {
      const ref = (item.reference_code || item.tracking_number?.reference_code || "").toLowerCase();
      const filer = ([item.first_name, item.last_name].filter(Boolean).join(" ") || item.filer_name || item.name || "").toLowerCase();
      const facility = (item.venue?.name || item.venue_name || item.facility_or_item || item.purpose || "").toLowerCase();
      const dept = (item.program_office || item.department || "").toLowerCase();
    return ref.includes(q) || filer.includes(q) || facility.includes(q) || dept.includes(q);
    });
  }, [activeTab, todayVenues, todayEquipment, searchQuery]);

  // Pagination for side-by-side dashboard balance
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedList = useMemo(() => {
    return filteredList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredList, startIndex]);

  const getStatusBadge = (status, item = null) => {
    const s = (status || item?.status || item?.tracking_number?.status || "").toLowerCase().trim();
    const isReturned = Boolean(item?.returned_at);

    if (s === "approved" || s === "confirmed" || s === "scheduled") {
      return (
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          Approved
        </span>
      );
    }
    if (s === "ongoing" || s === "on-going" || s === "borrowed" || s === "in_use" || s === "in-use") {
      return (
        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
          Ongoing
        </span>
      );
    }
    if (["completed", "returned", "done"].includes(s) || (isReturned && !["damaged", "lost", "late return", "returned late"].includes(s))) {
      return (
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
          Completed
        </span>
      );
    }
    if (s === "damaged") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
          <span>Completed</span>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">(Damaged)</span>
        </span>
      );
    }
    if (s === "lost") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
          <span>Completed</span>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">(Lost)</span>
        </span>
      );
    }
    if (s === "late return" || s === "returned late" || s === "returned_late") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
          <span>Completed</span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">(Late)</span>
        </span>
      );
    }
    if (s === "post-inspection" || s === "inspection") {
      return (
        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
          Post-Inspection
        </span>
      );
    }
    if (s === "rejected" || s === "cancelled" || s === "cancelled_by_user") {
      return (
        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
          {s.includes("cancel") ? "Cancelled" : "Rejected"}
        </span>
      );
    }
    return (
      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
        Pending
      </span>
    );
  };

  const getClassificationBadge = (classification) => {
    const c = (classification || "student").toLowerCase();
    if (c === "faculty") {
      return (
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
          Faculty
        </span>
      );
    }
    if (c === "external" || c === "external user") {
      return (
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          External
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
        Student
      </span>
    );
  };

  const getFacilityOrItem = (item, isVenue) => {
    if (isVenue) {
      return item.venue?.name || item.venue_name || item.facility_or_item || item.purpose || "Campus Facility";
    }
    // For equipment: prioritize real equipment item names and quantities
    if (item.facility_or_item && item.facility_or_item !== "Audio-Visual Equipment Loan" && item.facility_or_item !== "Equipment Loan") {
      return item.facility_or_item;
    }
    if (item.equipment_name) {
      return item.equipment_name;
    }
    if (Array.isArray(item.items) && item.items.length > 0) {
      const names = item.items
        .map((it) => {
          const eqName = it.equipment_type?.eq_name || it.equipmentType?.eq_name || it.name || it.category || "Equipment";
          const qty = it.quantity_requested || it.quantity || 1;
          return `${eqName} (${qty})`;
        })
        .filter(Boolean);
      if (names.length > 0) return names.join(", ");
    }
    if (Array.isArray(item.equipment_items) && item.equipment_items.length > 0) {
      const names = item.equipment_items
        .map((it) => `${it.name || it.eq_name || "Equipment"} (${it.quantity || 1})`)
        .filter(Boolean);
      if (names.length > 0) return names.join(", ");
    }
    return item.purpose || "Audio-Visual Equipment Loan";
  };

  const getRequestorName = (item) => {
    const parts = [item.first_name, item.middle_name, item.last_name, item.suffix].filter(Boolean);
    if (parts.length > 0) return parts.join(" ").trim();
    return item.filer_name || item.name || item.requestor_name || "Client";
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-2xs p-5 space-y-3.5 h-full flex flex-col justify-between">
      <div>
        {/* Header with Title and Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="font-extrabold text-foreground text-xs sm:text-sm">
              Today's Scheduled Reservations
            </h3>
            <p className="text-[11px] text-muted-foreground font-normal">
              Filter and review today's active venue events and equipment requisitions requiring clearance.
            </p>
          </div>

          {/* Filter Tabs: All, Venues, Equipment */}
          <div className="flex items-center p-0.5 bg-muted rounded-xl gap-0.5 border border-border self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({todayVenues.length + todayEquipment.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("venues")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "venues"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Venues ({todayVenues.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("equipment")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "equipment"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Equipment ({todayEquipment.length})
            </button>
          </div>
        </div>

        {/* Search Sub-bar */}
        <div className="flex items-center justify-between gap-3 pt-3">
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search reference, requestor, facility, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 px-3 rounded-lg bg-muted/40 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-medium"
            />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
            {filteredList.length} Items
          </span>
        </div>

        {/* Reservations Table */}
        <div className="overflow-x-auto mt-3 rounded-xl border border-border bg-card">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-10">
                <th className="py-2.5 px-3">REQUESTOR</th>
                <th className="py-2.5 px-3">TRACKING NO.</th>
                <th className="py-2.5 px-3">FACILITY / ITEM</th>
                <th className="py-2.5 px-3">TIME</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs font-semibold text-muted-foreground">
                    Loading today's reservations...
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs font-semibold text-muted-foreground">
                    No reservations found for today.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const isVenue = item.itemType === "venue";
                  const refCode = item.reference_code || item.tracking_number?.reference_code || (item.id ? `TRK-${isVenue ? "VB" : "EB"}-${item.id}` : "TRK-TODAY");
                  const filer = getRequestorName(item);
                  const classification = item.classification || item.identity_type || item.requestor_identity_type || "student";
                  const dept = item.program_office || item.department || item.requestor_program_office || "Academic Dept";
                  const facilityOrItem = getFacilityOrItem(item, isVenue);
                  const timeDisplay = `${formatTime(item.time_start || "08:00")} - ${formatTime(item.time_end || "17:00")}`;
                  const status = (item.status || item.tracking_number?.status || "pending").toLowerCase();
                  const isCompleted = [
                    "completed",
                    "returned",
                    "done",
                    "damaged",
                    "lost",
                    "late return",
                    "returned late",
                    "returned_late",
                  ].includes(status) || Boolean(item.returned_at);

                  let dutyAction = "Clearance";
                  if (isCompleted) {
                    dutyAction = "View";
                  } else if (status === "pending" || status === "incomplete") {
                    dutyAction = isVenue ? "Verify" : "Review";
                  } else if (status === "approved") {
                    dutyAction = isVenue ? "Inspect" : "Release";
                  } else if (status === "ongoing" || status === "on-going" || status === "borrowed") {
                    dutyAction = isVenue ? "Inspect" : "Receive";
                  }

                  const detailPath = isCompleted
                    ? (isSysadRoute ? "/sysad/history-log" : "/general/history-log")
                    : (isVenue
                        ? (isSysadRoute ? "/sysad/venue-bookings" : "/general/venue-bookings")
                        : (isSysadRoute ? "/sysad/equipment-borrowing" : "/general/equipment-borrowing"));

                  const linkState = isCompleted
                    ? { selectedId: item.id, targetType: isVenue ? "venue" : "equipment" }
                    : { selectedId: item.id };

                  return (
                    <tr key={`${item.itemType}-${item.id || item.reference_code}`} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-foreground text-xs">{filer}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getClassificationBadge(classification)}
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{dept}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-xs text-foreground whitespace-nowrap">
                        <Link
                          to={detailPath}
                          state={linkState}
                          className="hover:underline hover:text-primary transition-colors cursor-pointer"
                        >
                          {refCode}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground text-xs truncate max-w-[160px]">{facilityOrItem}</div>
                        <span className={`text-[10px] font-bold ${
                          isVenue ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {isVenue ? "Venue" : "Equipment"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {timeDisplay}
                      </td>
                      <td className="py-2.5 px-3">
                        {getStatusBadge(status, item)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          to={detailPath}
                          state={linkState}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border border-border hover:bg-muted text-foreground transition-colors cursor-pointer inline-block"
                        >
                          {dutyAction}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-border pt-3 mt-auto text-xs">
        <span className="text-[11px] text-muted-foreground font-medium">
          {filteredList.length === 0 ? (
            "0 items"
          ) : (
            `Showing ${startIndex + 1} to ${Math.min(startIndex + ITEMS_PER_PAGE, filteredList.length)} of ${filteredList.length} items`
          )}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer text-xs"
              title="Previous page"
            >
              <ChevronLeft size={13} />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === page
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer text-xs"
              title="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
