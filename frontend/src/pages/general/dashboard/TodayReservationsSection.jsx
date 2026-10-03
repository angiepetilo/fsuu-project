import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
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

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") {
      return (
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          Approved
        </span>
      );
    }
    if (s === "ongoing" || s === "on-going") {
      return (
        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
          Ongoing
        </span>
      );
    }
    if (s === "completed") {
      return (
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
          Completed
        </span>
      );
    }
    if (s === "rejected" || s === "cancelled") {
      return (
        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
          {s === "cancelled" ? "Cancelled" : "Rejected"}
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
    <div className="space-y-4 pt-2">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
            Today's Scheduled Reservations
          </h2>
          <p className="text-xs text-muted-foreground font-normal">
            Filter and review today's active venue events and equipment requisitions requiring clearance.
          </p>
        </div>

        {/* Filter Tabs: All, Venues, Equipment */}
        <div className="flex items-center p-1 bg-muted rounded-xl gap-1 border border-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 sm:max-w-md">
          <input
            type="text"
            placeholder="Search reference, requestor, facility, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none focus:border-primary font-medium"
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground self-center sm:self-auto">
          {filteredList.length} Items
        </span>
      </div>

      {/* Reservations Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Reference</th>
              <th className="py-3.5 px-4">Requestor</th>
              <th className="py-3.5 px-4">Facility / Item</th>
              <th className="py-3.5 px-4">Time</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-xs font-semibold text-muted-foreground">
                  Loading today's reservations...
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-xs font-semibold text-muted-foreground">
                  No reservations found for today.
                </td>
              </tr>
            ) : (
              filteredList.map((item) => {
                const isVenue = item.itemType === "venue";
                const refCode = item.reference_code || item.tracking_number?.reference_code || (item.id ? `TRK-${isVenue ? "VB" : "EB"}-${item.id}` : "TRK-TODAY");
                const filer = getRequestorName(item);
                const classification = item.classification || item.identity_type || item.requestor_identity_type || "student";
                const dept = item.program_office || item.department || item.requestor_program_office || "Academic Dept";
                const facilityOrItem = getFacilityOrItem(item, isVenue);
                const timeDisplay = `${formatTime(item.time_start || "08:00")} - ${formatTime(item.time_end || "17:00")}`;
                const status = (item.status || item.tracking_number?.status || "pending").toLowerCase();
                const detailPath = isVenue
                  ? (isSysadRoute ? "/sysad/venue-bookings" : "/general/venue-bookings")
                  : (isSysadRoute ? "/sysad/equipment-borrowing" : "/general/equipment-borrowing");

                let dutyAction = "Clearance";
                if (status === "pending") dutyAction = isVenue ? "Verify" : "Review";
                else if (status === "approved") dutyAction = isVenue ? "Inspect" : "Release";
                else if (status === "ongoing" || status === "on-going") dutyAction = isVenue ? "Inspect" : "Receive";

                return (
                  <tr key={`${item.itemType}-${item.id || item.reference_code}`} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className={`text-xs font-semibold ${
                        isVenue ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {isVenue ? "Venue" : "Equipment"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                      {refCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground">{filer}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {getClassificationBadge(classification)}
                        <span className="text-[11px] text-muted-foreground truncate max-w-[130px]">{dept}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {facilityOrItem}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      {timeDisplay}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={detailPath}
                        state={{ selectedId: item.id }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border hover:bg-muted text-foreground transition-colors cursor-pointer inline-block"
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
  );
}
