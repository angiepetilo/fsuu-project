import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  CalendarCheck, Building2, PackageOpen, Clock, User, 
  ArrowUpRight, RefreshCw, Search, CheckCircle2, ShieldAlert,
  PackageCheck, RotateCcw
} from "lucide-react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

export default function TodayReservations() {
  const [activeTab, setActiveTab] = useState("all"); // "all" | "venues" | "equipment"
  const [searchQuery, setSearchQuery] = useState("");
  const [venueBookings, setVenueBookings] = useState([]);
  const [equipBorrowings, setEquipBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      const [vRes, eRes] = await Promise.allSettled([
        api.get("/avr-venue-bookings"),
        api.get("/avr-equipment-borrowings")
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
      notify.error("Data Sync Failed", "Unable to load today's reservations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);

  const todayVenues = useMemo(() => {
    return venueBookings.filter(v => {
      const dateStr = v.date_of_usage || v.booking_date || v.start_datetime?.substring(0, 10);
      return !dateStr || dateStr === todayStr;
    }).map(v => ({ ...v, itemType: "venue" }));
  }, [venueBookings, todayStr]);

  const todayEquipment = useMemo(() => {
    return equipBorrowings.filter(e => {
      const dateStr = e.date_of_usage || e.start_datetime?.substring(0, 10);
      return !dateStr || dateStr === todayStr;
    }).map(e => ({ ...e, itemType: "equipment" }));
  }, [equipBorrowings, todayStr]);

  const combinedList = useMemo(() => {
    let list = [];
    if (activeTab === "all" || activeTab === "venues") list = list.concat(todayVenues);
    if (activeTab === "all" || activeTab === "equipment") list = list.concat(todayEquipment);

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter(item => {
      const ref = (item.reference_code || item.tracking_number?.reference_code || "").toLowerCase();
      const name = (item.borrower_name || item.name || "").toLowerCase();
      const title = (item.venue_name || item.equipment_name || item.purpose || "").toLowerCase();
      return ref.includes(q) || name.includes(q) || title.includes(q);
    });
  }, [todayVenues, todayEquipment, activeTab, searchQuery]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <CalendarCheck size={16} />
            <span>Workspace Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Today's Reservations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time schedule of campus venues and equipment handovers for today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTodayData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Sync</span>
          </Button>
          <Link to="/general/equipment-release">
            <Button size="sm" className="gap-2 font-semibold">
              <PackageCheck size={15} />
              <span>Release Desk</span>
            </Button>
          </Link>
          <Link to="/general/equipment-return">
            <Button variant="secondary" size="sm" className="gap-2 font-semibold">
              <RotateCcw size={15} />
              <span>Return Desk</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl shadow-xs">
        <div className="flex items-center p-1 bg-muted rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Today ({todayVenues.length + todayEquipment.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("venues")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "venues"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Venues ({todayVenues.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("equipment")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "equipment"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Equipment ({todayEquipment.length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search today's schedule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary font-medium"
          />
        </div>
      </div>

      {/* Grid of Reservation Cards */}
      {combinedList.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
          <CalendarCheck size={32} className="mx-auto text-muted-foreground/60" />
          <h3 className="text-base font-bold text-foreground">No Reservations Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            There are no facility reservations or equipment requisitions scheduled for today matching your filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {combinedList.map((item) => {
            const isVenue = item.itemType === "venue";
            const refCode = item.reference_code || item.tracking_number?.reference_code || `TRK-${item.id}`;
            const borrowerName = item.borrower_name || item.name || "Client";
            const status = item.status || "approved";

            return (
              <div
                key={`${item.itemType}-${item.id}`}
                className="bg-card border border-border rounded-2xl p-5 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                      {isVenue ? <Building2 size={12} className="text-blue-400" /> : <PackageOpen size={12} className="text-emerald-400" />}
                      <span>{isVenue ? "Venue Booking" : "Equipment"}</span>
                    </span>
                    <StatusBadge status={status} />
                  </div>

                  <span className="font-mono text-xs font-bold text-foreground block">
                    {refCode}
                  </span>

                  <h3 className="text-base font-bold text-foreground mt-1 line-clamp-1">
                    {isVenue ? item.venue_name || item.venue?.name || "Campus Venue" : item.equipment_name || item.purpose || "Equipment Requisition"}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User size={13} className="shrink-0" />
                      <span className="truncate text-foreground font-medium">{borrowerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="shrink-0" />
                      <span>{item.time_start || "08:00"} – {item.time_end || "17:00"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  {isVenue ? (
                    <Link
                      to={`/general/venue-bookings?search=${refCode}`}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>View Venue Details</span>
                      <ArrowUpRight size={14} />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <Link
                        to={`/general/equipment-release`}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <span>Release Desk</span>
                        <ArrowUpRight size={14} />
                      </Link>
                      <Link
                        to={`/general/equipment-return`}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <span>Return Desk</span>
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
