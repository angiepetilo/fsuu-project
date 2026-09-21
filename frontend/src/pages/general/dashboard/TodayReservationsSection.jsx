import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  PackageOpen,
  Search,
  ArrowUpRight,
  User,
  Users,
  GraduationCap,
} from "lucide-react";
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
    const rawEnd = item.reservation_end_date || item.end_date || item.date_of_usage_end || item.end_datetime || rawStart;
    const end = String(rawEnd).substring(0, 10);

    const status = (item.status || item.tracking_number?.status || "").toLowerCase();
    const isOngoing = ["ongoing", "on-going"].includes(status);

    if (start && end) {
      if (todayStr >= start && todayStr <= end) return true;
    } else if (start === todayStr) {
      return true;
    }

    return isOngoing;
  };

  const todayVenues = useMemo(() => {
    return (venueBookings || [])
      .filter(isItemForToday)
      .map((v) => ({ ...v, itemType: "venue" }));
  }, [venueBookings, todayStr]);

  const todayEquipment = useMemo(() => {
    return (equipBorrowings || [])
      .filter(isItemForToday)
      .map((e) => ({ ...e, itemType: "equipment" }));
  }, [equipBorrowings, todayStr]);

  const filteredList = useMemo(() => {
    let list = [];
    if (activeTab === "all" || activeTab === "venues") list = list.concat(todayVenues);
    if (activeTab === "all" || activeTab === "equipment") list = list.concat(todayEquipment);

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((item) => {
      const ref = (item.reference_code || item.tracking_number?.reference_code || "").toLowerCase();
      const filer = (item.filer_name || item.name || "").toLowerCase();
      const facility = (item.venue?.name || item.venue_name || item.purpose || "").toLowerCase();
      const dept = (item.program_office || item.department || "").toLowerCase();
      return ref.includes(q) || filer.includes(q) || facility.includes(q) || dept.includes(q);
    });
  }, [activeTab, todayVenues, todayEquipment, searchQuery]);

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
          Approved
        </span>
      );
    }
    if (s === "ongoing" || s === "on-going") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800">
          In Progress
        </span>
      );
    }
    if (s === "completed") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
          Completed
        </span>
      );
    }
    if (s === "rejected" || s === "cancelled") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800">
          {s === "cancelled" ? "Cancelled" : "Rejected"}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
        Pending
      </span>
    );
  };

  const getClassificationBadge = (classification) => {
    const c = (classification || "student").toLowerCase();
    if (c === "faculty") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <Users size={10} /> Faculty
        </span>
      );
    }
    if (c === "external" || c === "external user") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          <User size={10} /> External
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
        <GraduationCap size={10} /> Student
      </span>
    );
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Header with Title and Tabs (without Shift Operations badge) */}
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
            All Today ({todayVenues.length + todayEquipment.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("venues")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "venues"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 size={13} />
            <span>Venues ({todayVenues.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("equipment")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "equipment"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PackageOpen size={13} />
            <span>Equipment ({todayEquipment.length})</span>
          </button>
        </div>
      </div>

      {/* Search Sub-bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
          <input
            type="text"
            placeholder="Search reference code, requestor, facility, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-medium"
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground self-center sm:self-auto">
          Showing {filteredList.length} scheduled item{filteredList.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Reservations Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Tracking No.</th>
              <th className="py-3.5 px-4">Requestor</th>
              <th className="py-3.5 px-4">Facility / Item</th>
              <th className="py-3.5 px-4">Schedule Time</th>
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
                const refCode = item.reference_code || item.tracking_number?.reference_code || `TRK-${item.id}`;
                const filer = [item.first_name, item.last_name].filter(Boolean).join(" ").trim() || item.filer_name || item.name || "Client";
                const classification = item.classification || item.identity_type || "student";
                const dept = item.program_office || item.department || "Academic Dept";
                const facilityOrItem = isVenue
                  ? (item.venue?.name || item.venue_name || item.purpose || "Campus Facility")
                  : (item.purpose || item.equipment_name || "Audio-Visual Equipment Loan");
                const timeDisplay = `${formatTime(item.time_start || "08:00")} - ${formatTime(item.time_end || "17:00")}`;
                const status = (item.status || item.tracking_number?.status || "pending").toLowerCase();
                const detailPath = isVenue
                  ? (isSysadRoute ? "/sysad/venue-bookings" : "/general/venue-bookings")
                  : (isSysadRoute ? "/sysad/equipment-borrowing" : "/general/equipment-borrowing");

                let dutyAction = "Clearance";
                if (status === "pending") dutyAction = isVenue ? "Verify" : "Review";
                else if (status === "approved") dutyAction = isVenue ? "Pre-Inspect" : "Release";
                else if (status === "ongoing" || status === "on-going") dutyAction = isVenue ? "Post-Inspect" : "Receive";

                return (
                  <tr key={`${item.itemType}-${item.id}`} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                          isVenue
                            ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800"
                        }`}
                      >
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-extrabold text-xs bg-foreground text-background hover:bg-primary hover:text-primary-foreground transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>{dutyAction}</span>
                        <ArrowUpRight size={13} />
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
