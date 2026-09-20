import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  PackageOpen,
  CalendarCheck,
  Search,
  ArrowUpRight,
  RefreshCw,
  Clock,
  User,
  Users,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { usePermissions } from "@/hooks/usePermissions";
import { formatTime } from "@/lib/dateUtils";

export default function StudentAssistantDashboard() {
  const { user, isSuperAdmin, hasPermission } = usePermissions();

  const canBookVenue = isSuperAdmin || hasPermission("venue_bookings") || hasPermission("interface");
  const canBorrowEquipment = isSuperAdmin || hasPermission("equipment_borrowing") || hasPermission("interface");

  const [activeTab, setActiveTab] = useState(
    canBookVenue && canBorrowEquipment ? "all" : canBookVenue ? "venues" : "equipment"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [venueBookings, setVenueBookings] = useState([]);
  const [equipBorrowings, setEquipBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTodayData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [vRes, eRes] = await Promise.allSettled([
        api.get(`/avr-venue-bookings?_t=${Date.now()}`),
        api.get(`/avr-equipment-borrowings?_t=${Date.now()}`),
      ]);

      if (vRes.status === "fulfilled") {
        const vData = vRes.value.data?.data ?? (Array.isArray(vRes.value.data) ? vRes.value.data : []);
        setVenueBookings(vData);
      }
      if (eRes.status === "fulfilled") {
        const eData = eRes.value.data?.data ?? (Array.isArray(eRes.value.data) ? eRes.value.data : []);
        setEquipBorrowings(eData);
      }
    } catch {
      notify.error("Data Sync Notice", "Unable to sync latest shift schedule.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayData();
  }, [fetchTodayData]);

  useRealtimeSync(fetchTodayData, { interval: 30000 });

  // Today's Date String: YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  // Filter Today's / Active Venue Bookings (Approved, Pending, Ongoing, or Today's date)
  const todayVenues = useMemo(() => {
    return venueBookings
      .filter((v) => {
        const s = (v.status || v.tracking_number?.status || "").toLowerCase();
        const dateStr = v.date_of_usage || v.booking_date || v.start_datetime?.substring(0, 10);
        return ["approved", "pending", "ongoing", "on-going"].includes(s) || dateStr === todayStr;
      })
      .map((v) => ({ ...v, itemType: "venue" }));
  }, [venueBookings, todayStr]);

  // Filter Today's / Active Equipment Borrowings (Approved, Pending, Ongoing, or Today's date)
  const todayEquipment = useMemo(() => {
    return equipBorrowings
      .filter((e) => {
        const s = (e.status || e.tracking_number?.status || "").toLowerCase();
        const dateStr = e.date_of_usage || e.start_datetime?.substring(0, 10);
        return ["approved", "pending", "ongoing", "on-going"].includes(s) || dateStr === todayStr;
      })
      .map((e) => ({ ...e, itemType: "equipment" }));
  }, [equipBorrowings, todayStr]);

  // Combined and filtered list
  const filteredList = useMemo(() => {
    let list = [];
    if (activeTab === "all" || activeTab === "venues") list = list.concat(todayVenues);
    if (activeTab === "all" || activeTab === "equipment") list = list.concat(todayEquipment);

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter((item) => {
      const ref = (item.reference_code || item.tracking_number?.reference_code || "").toLowerCase();
      const filer = (item.filer_name || item.name || "").toLowerCase();
      const dept = (item.program_office || item.department || "").toLowerCase();
      const purpose = (item.purpose || item.venue_name || item.venue?.name || "").toLowerCase();
      const classification = (item.classification || "").toLowerCase();

      return (
        ref.includes(q) ||
        filer.includes(q) ||
        dept.includes(q) ||
        purpose.includes(q) ||
        classification.includes(q)
      );
    });
  }, [todayVenues, todayEquipment, activeTab, searchQuery]);

  const getClassificationBadge = (classification) => {
    const c = (classification || "student").toLowerCase();
    if (c === "student") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
          <GraduationCap size={11} />
          <span>Student</span>
        </span>
      );
    }
    if (c === "faculty" || c === "employee") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
          <Users size={11} />
          <span>Faculty</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
        <User size={11} />
        <span>External User</span>
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const s = (status || "pending").toLowerCase();
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
          In Progress / Handed Out
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
        Pending Review
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 animate-in fade-in duration-300">
      {/* ── Clean Minimal Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            Student Assistant Terminal &bull; Fast-track walk-in booking kiosks and scheduled reservations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchTodayData(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
          <span>{isRefreshing ? "Syncing..." : "Sync Schedule"}</span>
        </button>
      </div>

      {/* ── Quick Action Interfaces ── */}
      {(canBookVenue || canBorrowEquipment) && (
        <div className={`grid grid-cols-1 ${canBookVenue && canBorrowEquipment ? "sm:grid-cols-2" : ""} gap-4`}>
          {/* Quick Button 1: Book Venue Interface */}
          {canBookVenue && (
            <Link
              to="/interface/venue"
              className="group bg-card hover:bg-muted/30 border border-border hover:border-primary/50 rounded-2xl p-5 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                    <span>Launch Interface</span>
                    <ArrowUpRight size={14} />
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    Book Venue Interface
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Reserve campus facilities, AVRs, webcast studios, or auditoriums with walk-in filing.
                  </p>
                </div>

                {/* 3 User Types Supported */}
                <div className="pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1">
                    Supported:
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <GraduationCap size={11} />
                    <span>Student</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Users size={11} />
                    <span>Faculty</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <User size={11} />
                    <span>External User</span>
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Quick Button 2: Borrow Equipment Interface */}
          {canBorrowEquipment && (
            <Link
              to="/interface/equipment"
              className="group bg-card hover:bg-muted/30 border border-border hover:border-emerald-500/50 rounded-2xl p-5 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <PackageOpen size={20} />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Launch Interface</span>
                    <ArrowUpRight size={14} />
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Borrow Equipment Interface
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Borrow audiovisual equipment, projectors, wireless microphones, and accessories.
                  </p>
                </div>

                {/* 3 User Types Supported */}
                <div className="pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1">
                    Supported:
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <GraduationCap size={11} />
                    <span>Student</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Users size={11} />
                    <span>Faculty</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <User size={11} />
                    <span>External User</span>
                  </span>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── SECTION 2: TODAY'S RESERVATIONS (FILTER BY VENUE & EQUIPMENT) ── */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
              <CalendarCheck size={15} />
              <span>Shift Operations</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
              Today's Scheduled Reservations
            </h2>
            <p className="text-xs text-muted-foreground font-normal">
              Filter and review today's active venue events and equipment requisitions requiring clearance.
            </p>
          </div>

          {/* Filter Tabs: All, Venues, Equipment */}
          {canBookVenue && canBorrowEquipment ? (
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
          ) : (
            <div className="flex items-center px-3 py-1 bg-muted rounded-xl text-xs font-bold text-muted-foreground border border-border">
              {canBookVenue ? `Venues Today (${todayVenues.length})` : `Equipment Today (${todayEquipment.length})`}
            </div>
          )}
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

        {/* Schedule Cards / Items */}
        {loading ? (
          <div className="p-12 text-center bg-card border border-border rounded-3xl space-y-3">
            <RefreshCw size={28} className="animate-spin text-primary mx-auto" />
            <p className="text-xs font-bold text-muted-foreground">Loading today's reservations...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-foreground">All Clear for Today</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No {activeTab === "all" ? "reservations" : activeTab === "venues" ? "venue bookings" : "equipment borrowings"} found for today. Use the walk-in booking buttons above to file new requests.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((item) => {
              const isVenue = item.itemType === "venue";
              const refCode = item.reference_code || item.tracking_number?.reference_code || `TRK-${item.id}`;
              const filer = item.filer_name || item.name || "Client";
              const classification = item.classification || "student";
              const dept = item.program_office || item.department || "Academic Dept";
              const facilityOrItem = isVenue
                ? (item.venue?.name || item.venue_name || item.purpose || "Campus Facility")
                : (item.purpose || "Audio-Visual Equipment Loan");
              const timeDisplay = `${formatTime(item.time_start || "08:00")} - ${formatTime(item.time_end || "17:00")}`;
              const status = (item.status || "pending").toLowerCase();

              return (
                <div
                  key={`${item.itemType}-${item.id}`}
                  className="bg-card border border-border hover:border-primary/40 rounded-3xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Row: Type + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                          isVenue
                            ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800"
                        }`}
                      >
                        {isVenue ? <Building2 size={12} /> : <PackageOpen size={12} />}
                        <span>{isVenue ? "Venue" : "Equipment"}</span>
                      </span>

                      {getStatusBadge(status)}
                    </div>

                    {/* Reference Code & Filer Details */}
                    <div>
                      <span className="font-mono text-xs font-black text-foreground block">
                        {refCode}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-sm text-foreground truncate">
                          {filer}
                        </span>
                        {getClassificationBadge(classification)}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium block mt-0.5">
                        {dept}
                      </span>
                    </div>

                    {/* Facility / Item & Schedule */}
                    <div className="bg-muted/40 rounded-2xl p-3 space-y-1.5 text-xs border border-border/60">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-muted-foreground text-[11px] font-semibold">Purpose / Item:</span>
                        <span className="font-bold text-foreground text-right truncate">{facilityOrItem}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-[11px] font-semibold">Schedule:</span>
                        <span className="font-mono font-bold text-foreground inline-flex items-center gap-1 text-[11px]">
                          <Clock size={11} className="text-muted-foreground" />
                          <span>{timeDisplay}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Link Footer */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      {isVenue ? "Venue Verification" : status === "approved" ? "Ready for Release" : "Return Testing"}
                    </span>

                    {isVenue ? (
                      <Link
                        to={`/general/venue-bookings?search=${encodeURIComponent(refCode)}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        <span>View Details</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    ) : status === "approved" ? (
                      <Link
                        to="/general/equipment-release"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                      >
                        <span>Release Desk</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    ) : (
                      <Link
                        to="/general/equipment-return"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 transition-colors"
                      >
                        <span>Return Desk</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
