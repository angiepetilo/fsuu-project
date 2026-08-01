import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import MetricsOverview from "./dashboard/MetricsOverview";
import BookingCalendar from "./dashboard/BookingCalendar";
import { Building2, RefreshCw, AlertCircle, Award, BarChart3 } from "lucide-react";
import { ContentCard } from "@/components/ui/app-card";

export default function Dashboard() {
  const context = useOutletContext();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Metrics Data (Item 8)
  const [totalVenueBookings, setTotalVenueBookings] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(0);
  const [totalEquipBorrows, setTotalEquipBorrows] = useState(0);
  const [totalDamaged, setTotalDamaged] = useState(0);
  const [totalLost, setTotalLost] = useState(0);

  // Department Venue Booking Volume Ranking (Item 9)
  const [departmentRankings, setDepartmentRankings] = useState([]);

  // Active Venue Bookings for Calendar (Item 10)
  const [calendarBookings, setCalendarBookings] = useState([]);

  // Side Calendar State
  const today = new Date();
  const initialMonth = (today.getFullYear() === 2026 && today.getMonth() === 6) ? 7 : today.getMonth();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(initialMonth);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const monthLabel = new Date(calYear, calMonth).toLocaleString("default", { month: "short", year: "numeric" });
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [histRes, vbRes, eqRes] = await Promise.all([
        api.get("/admin/history-log").catch(() => ({ data: { venue_bookings: [], equipment_borrowings: [] } })),
        api.get("/avr-venue-bookings").catch(() => ({ data: { data: [] } })),
        api.get("/admin/equipment-types").catch(() => ({ data: [] })),
      ]);

      // 1. History Log Data (Total completed venue bookings & equipment borrows)
      const histVB = histRes.data?.venue_bookings || [];
      const histEB = histRes.data?.equipment_borrowings || [];
      setTotalVenueBookings(histVB.length);
      setTotalEquipBorrows(histEB.length);

      // 2. Pending Approval count from active venue bookings
      const activeVB = vbRes.data?.data ?? (Array.isArray(vbRes.data) ? vbRes.data : []);
      setCalendarBookings(activeVB);
      const pendingCount = activeVB.filter(b => (b.status || b.tracking_number?.status || "").toLowerCase() === "pending").length;
      setPendingApproval(pendingCount);

      // 3. Equipment Damages & Lost count from Equipment Inventory Stock
      const eqTypes = Array.isArray(eqRes.data) ? eqRes.data : [];
      let damagedCount = 0;
      let lostCount = 0;
      eqTypes.forEach(e => {
        if (e.status === 'maintenance' || e.status === 'damaged') damagedCount += (e.total_quantity || 1);
        if (e.status === 'decommissioned' || e.status === 'lost') lostCount += (e.total_quantity || 1);
      });
      setTotalDamaged(damagedCount);
      setTotalLost(lostCount);

      // 4. Department Ranking by Venue Bookings (Item 9)
      const deptCounts = {};
      histVB.concat(activeVB).forEach(b => {
        const dept = b.program_office || b.department || b.filer_name || "General Academic Dept";
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });

      const sortedDepts = Object.keys(deptCounts).map(dept => ({
        department: dept,
        count: deptCounts[dept],
      })).sort((a, b) => b.count - a.count);

      setDepartmentRankings(sortedDepts.slice(0, 5));

    } catch {
      setError("Unable to sync dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calendar Day Details helper (Item 10)
  const getDayDetails = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    const bookedOnDate = calendarBookings.filter(b => {
      const d = b.date_of_usage || b.date_of_use || b.date || "";
      return d.startsWith(dateStr);
    });

    if (bookedOnDate.length === 0) {
      return { status: "available", tooltip: `${monthLabel} ${day}: All venue slots open & available` };
    }

    const detailsText = bookedOnDate.map(b => {
      const vName = b.venue?.name || b.venue_name || b.venue || "AVR Auditorium";
      const filer = b.filer_name || b.requestor || "Requestor";
      return `${vName} by ${filer}`;
    }).join(" | ");

    const status = bookedOnDate.length >= 3 ? "fully" : "partial";
    return {
      status,
      tooltip: `${monthLabel} ${day} Venue Bookings: ${detailsText}`
    };
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-blue-600" size={24} />
            Institutional Dashboard Overview
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Real-time metric snapshot for {officeScope}.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-xs shadow-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Item 8: 5 Metrics Overview */}
      <MetricsOverview
        totalVenueBookings={totalVenueBookings}
        pendingApproval={pendingApproval}
        totalEquipBorrows={totalEquipBorrows}
        totalDamaged={totalDamaged}
        totalLost={totalLost}
      />

      {/* Grid: Item 9 (Department Ranking) & Item 10 (Venue Calendar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Item 9: Department with Most Venue Bookings within office-scope */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Award size={18} className="text-amber-500" />
                  Departments with Most Venue Bookings
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Ranked by venue reservation volume recorded in history log ({officeScope})
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-10 text-center text-slate-400 text-xs font-semibold">Loading department analytics...</div>
            ) : departmentRankings.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-semibold">No venue booking history recorded yet.</div>
            ) : (
              <div className="space-y-4 pt-1">
                {departmentRankings.map((item, idx) => {
                  const maxCount = departmentRankings[0]?.count || 1;
                  const pct = Math.round((item.count / maxCount) * 100);

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">
                            #{idx + 1}
                          </span>
                          {item.department}
                        </span>
                        <span className="font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-[11px]">
                          {item.count} Bookings
                        </span>
                      </div>

                      {/* Visual Bar */}
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Item 10: Venue Availability Calendar */}
        <div className="lg:col-span-5">
          <BookingCalendar
            monthLabel={monthLabel}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            firstDayOfWeek={firstDayOfWeek}
            daysInMonth={daysInMonth}
            getDayDetails={getDayDetails}
          />
        </div>

      </div>

    </div>
  );
}
