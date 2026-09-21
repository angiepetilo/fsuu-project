import { useState, useCallback, useMemo } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import api from "@/lib/axios";
import { formatTimeRange12 } from "@/lib/dateUtils";
import StaffAnalyticsDashboard from "./dashboard/StaffAnalyticsDashboard";

export default function Dashboard() {
  const context = useOutletContext();
  const location = useLocation();
  const { user, isSuperAdmin, hasPermission } = usePermissions();

  const isSysadRoute = location.pathname.startsWith("/sysad");

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
  const [equipmentInventory, setEquipmentInventory] = useState(cachedData?.equipmentInventory || { total_active: 0, available: 0, damaged: 0, lost: 0, released: 0, disabled: 0 });
  const [recentInventoryChanges, setRecentInventoryChanges] = useState([]);

  // Dynamic Real Analytics Calculations
  const [topBookedDepartments, setTopBookedDepartments] = useState(cachedData?.topBookedDepartments || []);
  const [mostUsedEquipment, setMostUsedEquipment] = useState([]);
  const [topViolatingDepartments, setTopViolatingDepartments] = useState(cachedData?.topViolatingDepartments || []);
  const [topLateDepartment, setTopLateDepartment] = useState("None");
  const [violatingStudents, setViolatingStudents] = useState([]);

  // Active Venue Bookings & Equipment Borrowings for Today's Scheduled Reservations
  const [venueBookings, setVenueBookings] = useState([]);
  const [equipBorrowings, setEquipBorrowings] = useState([]);

  // Granular Section Permissions Calculation
  const hasSpecificSubPermission = useMemo(() => {
    return [
      "dashboard.quick_venue",
      "dashboard.quick_equipment",
      "dashboard.metrics",
      "dashboard.analytics",
      "dashboard.inventory_status",
      "dashboard.inventory_changes",
      "dashboard.late_returns",
      "dashboard.today_reservations",
    ].some((p) => hasPermission(p));
  }, [hasPermission]);

  const canQuickVenue = isSuperAdmin || hasPermission("dashboard.quick_venue") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canQuickEquipment = isSuperAdmin || hasPermission("dashboard.quick_equipment") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canMetrics = isSuperAdmin || hasPermission("dashboard.metrics") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canAnalytics = isSuperAdmin || hasPermission("dashboard.analytics") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canInventoryStatus = isSuperAdmin || hasPermission("dashboard.inventory_status") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canInventoryChanges = isSuperAdmin || hasPermission("dashboard.inventory_changes") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canLateReturns = isSuperAdmin || hasPermission("dashboard.late_returns") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canTodayReservations = isSuperAdmin || hasPermission("dashboard.today_reservations") || (!hasSpecificSubPermission && hasPermission("dashboard"));

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading && !cachedData) setLoading(true);
    setError(null);
    try {
      const [statsRes, vRes, eRes] = await Promise.allSettled([
        api.get(`/dashboard/stats?_t=${Date.now()}`),
        api.get(`/avr-venue-bookings?_t=${Date.now()}`),
        api.get(`/avr-equipment-borrowings?_t=${Date.now()}`),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value.data) {
        const statsData = statsRes.value.data;
        const q = statsData.quick_stats || {};
        setTotalVenueBookings(q.total_venue_bookings || 0);
        setTotalEquipBorrows(q.total_equip_borrows || 0);
        setPendingApproval(q.pending_approval !== undefined ? q.pending_approval : ((q.pending_bookings || 0) + (q.pending_borrowings || 0)));
        setPendingEquipBorrowings(q.pending_borrowings || 0);
        setTotalDamaged(q.total_equipment_damages || q.damage_reports || 0);
        setTotalLost(q.total_equipment_lost || 0);
        setTopLateDepartment(q.top_late_department || "None");

        const rawDepts = statsData.top_departments || [];
        const totalAllBookings = rawDepts.reduce((sum, d) => sum + (d.bookings || d.count || 0), 0) || 1;
        const finalDepts = rawDepts.map(d => ({
          name: d.name || d.program || "Department",
          count: d.bookings || d.count || 0,
          pct: Math.round(((d.bookings || d.count || 0) / totalAllBookings) * 100)
        }));
        setTopBookedDepartments(finalDepts);
        setMostUsedEquipment(statsData.top_equipment || []);

        const rawViolations = (statsData.programs_with_violations || []).map(p => ({
          dept: p.program || p.dept || "Academic Dept",
          count: (p.violations || 0) + (p.late || 0) || p.count || 0,
          late: p.late || 0,
          violations: p.violations || 0,
        }));
        setTopViolatingDepartments(rawViolations);
        setViolatingStudents(statsData.violating_students || []);
        setEquipmentInventory(statsData.equipment_inventory || { total_active: 0, available: 0, damaged: 0, lost: 0, released: 0, disabled: 0 });
        setRecentInventoryChanges(statsData.recent_inventory_changes || []);

        try {
          localStorage.setItem("fsuu_cache_admin_dashboard", JSON.stringify({
            totalVenueBookings: q.total_venue_bookings || 0,
            pendingApproval: q.pending_approval !== undefined ? q.pending_approval : ((q.pending_bookings || 0) + (q.pending_borrowings || 0)),
            pendingEquipBorrowings: q.pending_borrowings || 0,
            totalEquipBorrows: q.total_equip_borrows || 0,
            totalDamaged: q.total_equipment_damages || q.damage_reports || 0,
            totalLost: q.total_equipment_lost || 0,
            equipmentInventory: statsData.equipment_inventory || {},
            topBookedDepartments: finalDepts,
            topViolatingDepartments: rawViolations,
          }));
        } catch {}
      }

      if (vRes.status === "fulfilled") {
        const vData = vRes.value.data?.data ?? (Array.isArray(vRes.value.data) ? vRes.value.data : []);
        setVenueBookings(vData);
      }

      if (eRes.status === "fulfilled") {
        const eData = eRes.value.data?.data ?? (Array.isArray(eRes.value.data) ? eRes.value.data : []);
        setEquipBorrowings(eData);
      }

    } catch {
      setError("Unable to sync dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [cachedData]);

  useRealtimeSync(fetchData, { interval: 30000 });

  const handleRefresh = useCallback(() => fetchData(true), [fetchData]);

  // Guard: User must have dashboard permission
  if (!isSuperAdmin && !hasPermission("dashboard") && !hasSpecificSubPermission) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3 mt-12 bg-card rounded-3xl border border-border shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-sm font-extrabold text-foreground">Access Restricted</h3>
        <p className="text-xs text-muted-foreground font-medium">
          You do not have permission to view the Dashboard.
        </p>
      </div>
    );
  }

  // Unified Dashboard for All Roles (widgets dynamically toggled via permissions)
  return (
    <StaffAnalyticsDashboard
      loading={loading}
      error={error}
      onRefresh={handleRefresh}
      canQuickVenue={canQuickVenue}
      canQuickEquipment={canQuickEquipment}
      canMetrics={canMetrics}
      canAnalytics={canAnalytics}
      canInventoryStatus={canInventoryStatus}
      canInventoryChanges={canInventoryChanges}
      canLateReturns={canLateReturns}
      canTodayReservations={canTodayReservations}
      totalVenueBookings={totalVenueBookings}
      pendingApproval={pendingApproval}
      postInspectionPending={0}
      totalEquipBorrows={totalEquipBorrows}
      totalDamaged={totalDamaged}
      totalLost={totalLost}
      equipmentInventory={equipmentInventory}
      recentInventoryChanges={recentInventoryChanges}
      topBookedDepartments={topBookedDepartments}
      mostUsedEquipment={mostUsedEquipment}
      topViolatingDepartments={topViolatingDepartments}
      topLateDepartment={topLateDepartment}
      violatingStudents={violatingStudents}
      venueBookings={venueBookings}
      equipBorrowings={equipBorrowings}
      isSysadRoute={isSysadRoute}
    />
  );
}
