import { useState } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import api from "@/lib/axios";
import { formatTimeRange12 } from "@/lib/dateUtils";
import { AlertCircle } from "lucide-react";
import StudentStaffDashboard from "./dashboard/StudentStaffDashboard";
import StaffAnalyticsDashboard from "./dashboard/StaffAnalyticsDashboard";

export default function Dashboard() {
  const context = useOutletContext();
  const location = useLocation();
  const { user, isSuperAdmin, isStudentAssistant, isStaff, hasPermission } = usePermissions();

  const isSysadRoute = location.pathname.startsWith("/sysad");

  if (!isSuperAdmin && !hasPermission("dashboard")) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3 mt-12 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-sm font-extrabold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 font-medium">
          You do not have permission to view the Dashboard.
        </p>
      </div>
    );
  }

  const [cachedData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fsuu_cache_admin_dashboard") || "null");
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);

  const [totalVenueBookings, setTotalVenueBookings] = useState(cachedData?.totalVenueBookings || 0);
  const [pendingApproval, setPendingApproval] = useState(cachedData?.pendingApproval || 0);
  const [pendingEquipBorrowings, setPendingEquipBorrowings] = useState(cachedData?.pendingEquipBorrowings || 0);
  const [totalEquipBorrows, setTotalEquipBorrows] = useState(cachedData?.totalEquipBorrows || 0);
  const [totalDamaged, setTotalDamaged] = useState(cachedData?.totalDamaged || 0);
  const [totalLost, setTotalLost] = useState(cachedData?.totalLost || 0);

  // Dynamic Real Analytics Calculations
  const [topBookedDepartments, setTopBookedDepartments] = useState(cachedData?.topBookedDepartments || []);
  const [mostUsedEquipment, setMostUsedEquipment] = useState([]);
  const [topViolatingDepartments, setTopViolatingDepartments] = useState(cachedData?.topViolatingDepartments || []);
  const [topLateDepartment, setTopLateDepartment] = useState("None");
  const [violatingStudents, setViolatingStudents] = useState([]);

  // Active Venue Bookings across ALL Venues for Calendar & Staff Tasks
  const [calendarBookings, setCalendarBookings] = useState([]);
  const [staffTasks, setStaffTasks] = useState([]);
  const [staffTaskFilter, setStaffTaskFilter] = useState("all"); // "all" | "venue" | "equipment"

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

  const fetchData = async (showLoading = true) => {
    if (showLoading && !cachedData) setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/dashboard/stats?_t=${Date.now()}`);
      const statsData = res.data;

      if (!statsData) {
        setLoading(false);
        return;
      }

      const q = statsData.quick_stats || {};
      setTotalVenueBookings(q.total_venue_bookings || 0);
      setTotalEquipBorrows(q.total_equip_borrows || 0);
      setPendingApproval(q.pending_approval !== undefined ? q.pending_approval : ((q.pending_bookings || 0) + (q.pending_borrowings || 0)));
      setPendingEquipBorrowings(q.pending_borrowings || 0);
      setTotalDamaged(q.total_equipment_damages || q.damage_reports || 0);
      setTotalLost(q.total_equipment_lost || 0);
      setTopLateDepartment(q.top_late_department || "None");

      // Top Departments
      const rawDepts = statsData.top_departments || [];
      const totalAllBookings = rawDepts.reduce((sum, d) => sum + (d.bookings || d.count || 0), 0) || 1;
      const finalDepts = rawDepts.map(d => ({
        name: d.name || d.program || "Department",
        count: d.bookings || d.count || 0,
        pct: Math.round(((d.bookings || d.count || 0) / totalAllBookings) * 100)
      }));
      setTopBookedDepartments(finalDepts);

      // Top Equipment
      setMostUsedEquipment(statsData.top_equipment || []);

      // Top Violations
      const rawViolations = (statsData.programs_with_violations || []).map(p => ({
        dept: p.program || p.dept || "Academic Dept",
        count: (p.violations || 0) + (p.late || 0) || p.count || 0,
        late: p.late || 0,
        violations: p.violations || 0,
      }));
      setTopViolatingDepartments(rawViolations);

      // Violating Students
      setViolatingStudents(statsData.violating_students || []);

      // Calendar & Staff Tasks
      const calBookings = statsData.calendar_bookings || [];
      setCalendarBookings(calBookings);

      const tasks = [];
      calBookings.forEach((b, idx) => {
        const s = (b.status || "").toLowerCase();
        const ref = b.reference_code || `TRK-${b.id}`;
        const filer = b.filer_name || "FSUU Filer";
        const isEquipment = b.venue_name === "Equipment Loan" || !b.venue_name || b.venue_name.toLowerCase().includes("equipment");
        const vName = isEquipment ? (b.purpose || "Equipment Borrowing") : (b.venue_name || "AVR Facility");
        const tRange = formatTimeRange12(b.time_start || b.start_time, b.time_end || b.end_time);

        if (s === "pending") {
          tasks.push({
            id: `task-${b.id || idx}`,
            type: isEquipment ? "equipment" : "venue",
            tracking_no: ref,
            borrower: filer,
            equipment: vName,
            time: tRange,
            task: isEquipment ? "Review Equipment Borrowing" : "Verify Venue Reservation",
            action_label: "Review",
            link: isEquipment 
              ? (isSysadRoute ? "/sysad/equipment-borrowing" : "/general/equipment-borrowing")
              : (isSysadRoute ? "/sysad/venue-bookings" : "/general/venue-bookings"),
          });
        } else if (s === "ongoing" || s === "on-going" || s === "approved") {
          tasks.push({
            id: `task-${b.id || idx}`,
            type: isEquipment ? "equipment" : "venue",
            tracking_no: ref,
            borrower: filer,
            equipment: vName,
            time: tRange,
            task: isEquipment
              ? (s === "approved" ? "Release Equipment" : "Check In Returned Equipment")
              : (s === "approved" ? "Pre-Event Inspection" : "Inspect Returned Venue"),
            action_label: isEquipment ? (s === "approved" ? "Release" : "Receive") : "Inspect",
            link: isEquipment 
              ? (isSysadRoute ? "/sysad/equipment-borrowing" : "/general/equipment-borrowing")
              : (isSysadRoute ? "/sysad/venue-bookings" : "/general/venue-bookings"),
          });
        }
      });
      setStaffTasks(tasks);

      try {
        localStorage.setItem("fsuu_cache_admin_dashboard", JSON.stringify({
          totalVenueBookings: q.total_venue_bookings || 0,
          pendingApproval: q.pending_approval !== undefined ? q.pending_approval : ((q.pending_bookings || 0) + (q.pending_borrowings || 0)),
          pendingEquipBorrowings: q.pending_borrowings || 0,
          totalEquipBorrows: q.total_equip_borrows || 0,
          totalDamaged: q.total_equipment_damages || q.damage_reports || 0,
          totalLost: q.total_equipment_lost || 0,
          topBookedDepartments: finalDepts,
          topViolatingDepartments: rawViolations,
        }));
      } catch {}

    } catch {
      setError("Unable to sync dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useRealtimeSync(fetchData, { interval: 30000 });

  // Calendar Day Details helper
  const getDayDetails = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    const bookedOnDate = calendarBookings.filter(b => {
      const startD = (b.date_of_usage || b.date_of_use || b.date || "").substring(0, 10);
      const endD = (b.reservation_end_date || b.date_of_usage_end || b.end_date || startD).substring(0, 10);
      if (!startD) return false;
      return dateStr >= startD && dateStr <= endD;
    });

    const isBooked = bookedOnDate.length > 0;
    const isPending = bookedOnDate.some(b => (b.status || "").toLowerCase() === "pending");
    const isOngoing = bookedOnDate.some(b => ["ongoing", "on-going", "approved"].includes((b.status || "").toLowerCase()));
    const isCompleted = bookedOnDate.some(b => ["completed", "late return", "returned late", "damaged", "lost"].includes((b.status || "").toLowerCase()));

    return {
      isBooked,
      isPending,
      isOngoing,
      isCompleted,
      bookings: bookedOnDate,
    };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: STUDENT ASSISTANT SHIFT DASHBOARD
  // ──────────────────────────────────────────────────────────────────────────
  if (isStudentAssistant) {
    return (
      <StudentStaffDashboard
        staffTasks={staffTasks}
        staffTaskFilter={staffTaskFilter}
        setStaffTaskFilter={setStaffTaskFilter}
        loading={loading}
        error={error}
        onRefresh={() => fetchData(true)}
        isSysadRoute={isSysadRoute}
      />
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: STAFF & SUPER ADMIN EXECUTIVE ANALYTICS DASHBOARD
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <StaffAnalyticsDashboard
      loading={loading}
      error={error}
      onRefresh={() => fetchData(true)}
      totalVenueBookings={totalVenueBookings}
      pendingApproval={pendingApproval}
      totalEquipBorrows={totalEquipBorrows}
      totalDamaged={totalDamaged}
      totalLost={totalLost}
      topBookedDepartments={topBookedDepartments}
      mostUsedEquipment={mostUsedEquipment}
      topViolatingDepartments={topViolatingDepartments}
      topLateDepartment={topLateDepartment}
      violatingStudents={violatingStudents}
      monthLabel={monthLabel}
      prevMonth={prevMonth}
      nextMonth={nextMonth}
      firstDayOfWeek={firstDayOfWeek}
      daysInMonth={daysInMonth}
      getDayDetails={getDayDetails}
      calMonth={calMonth}
      setCalMonth={setCalMonth}
      calYear={calYear}
      setCalYear={setCalYear}
    />
  );
}
