import { useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import api from "@/lib/axios";

const StaffAnalyticsDashboard = lazy(() => import("./dashboard/StaffAnalyticsDashboard"));

export default function Dashboard() {
  const context = useOutletContext();
  const location = useLocation();
  const { isSuperAdmin, hasPermission } = usePermissions();

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
  const [equipmentInventory, setEquipmentInventory] = useState(
    cachedData?.equipmentInventory || { total_active: 0, available: 0, damaged: 0, lost: 0, released: 0, disabled: 0 }
  );
  const [recentInventoryChanges, setRecentInventoryChanges] = useState(cachedData?.recentInventoryChanges || []);

  // Dynamic Real Analytics Calculations (seeded from cache for instant 0ms paint)
  const [topBookedDepartments, setTopBookedDepartments] = useState(cachedData?.topBookedDepartments || []);
  const [mostUsedEquipment, setMostUsedEquipment] = useState(cachedData?.mostUsedEquipment || []);
  const [topViolatingDepartments, setTopViolatingDepartments] = useState(cachedData?.topViolatingDepartments || []);
  const [topLateDepartment, setTopLateDepartment] = useState(cachedData?.topLateDepartment || "None");
  const [violatingStudents, setViolatingStudents] = useState(cachedData?.violatingStudents || []);

  // Active Venue Bookings & Equipment Borrowings for Today's Scheduled Reservations
  const [venueBookings, setVenueBookings] = useState(() => {
    if (cachedData?.venueBookings) return cachedData.venueBookings;
    try {
      return JSON.parse(sessionStorage.getItem("fsuu_cache_venue_bookings") || "[]");
    } catch {
      return [];
    }
  });
  const [equipBorrowings, setEquipBorrowings] = useState(() => {
    if (cachedData?.equipBorrowings) return cachedData.equipBorrowings;
    try {
      return JSON.parse(sessionStorage.getItem("fsuu_cache_equip_borrowings") || "[]");
    } catch {
      return [];
    }
  });

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

  const canQuickVenue = !isSuperAdmin && !isSysadRoute && (hasPermission("dashboard.quick_venue") || (!hasSpecificSubPermission && hasPermission("dashboard")));
  const canQuickEquipment = !isSuperAdmin && !isSysadRoute && (hasPermission("dashboard.quick_equipment") || (!hasSpecificSubPermission && hasPermission("dashboard")));
  const canMetrics = isSuperAdmin || hasPermission("dashboard.metrics") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canAnalytics = isSuperAdmin || hasPermission("dashboard.analytics") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canInventoryStatus = isSuperAdmin || hasPermission("dashboard.inventory_status") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canInventoryChanges = isSuperAdmin || hasPermission("dashboard.inventory_changes") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canLateReturns = isSuperAdmin || hasPermission("dashboard.late_returns") || (!hasSpecificSubPermission && hasPermission("dashboard"));
  const canTodayReservations = isSuperAdmin || hasPermission("dashboard.today_reservations") || (!hasSpecificSubPermission && hasPermission("dashboard"));

  const fetchData = useCallback(async (opts = false) => {
    const isSilent = typeof opts === "object" && opts !== null
      ? Boolean(opts.isSilent || opts.silent || opts.showLoading === false)
      : Boolean(opts);

    if (!isSilent && !cachedData) setLoading(true);
    setError(null);
    try {
      const [statsRes, vRes, eRes] = await Promise.allSettled([
        api.get("/dashboard/stats"),
        api.get("/avr-venue-bookings"),
        api.get("/avr-equipment-borrowings"),
      ]);

      let statsData = null;
      let nextCachePayload = {};

      if (statsRes.status === "fulfilled" && statsRes.value.data) {
        statsData = statsRes.value.data;
        const q = statsData.quick_stats || {};
        const nextTotalVb = q.total_venue_bookings || 0;
        const nextTotalEb = q.total_equip_borrows || 0;
        const nextPendingApp = q.pending_approval !== undefined ? q.pending_approval : ((q.pending_bookings || 0) + (q.pending_borrowings || 0));
        const nextPendingEb = q.pending_borrowings || 0;
        const nextDamaged = q.total_equipment_damages || q.damage_reports || 0;
        const nextLost = q.total_equipment_lost || 0;
        const nextTopLate = q.top_late_department || "None";

        setTotalVenueBookings(nextTotalVb);
        setTotalEquipBorrows(nextTotalEb);
        setPendingApproval(nextPendingApp);
        setPendingEquipBorrowings(nextPendingEb);
        setTotalDamaged(nextDamaged);
        setTotalLost(nextLost);
        setTopLateDepartment(nextTopLate);

        const rawDepts = statsData.top_departments || [];
        const totalAllBookings = rawDepts.reduce((sum, d) => sum + (d.bookings || d.count || 0), 0) || 1;
        const finalDepts = rawDepts.map(d => ({
          name: d.name || d.program || "Department",
          count: d.bookings || d.count || 0,
          pct: Math.round(((d.bookings || d.count || 0) / totalAllBookings) * 100)
        }));
        setTopBookedDepartments(finalDepts);

        const nextTopEquip = statsData.top_equipment || [];
        setMostUsedEquipment(nextTopEquip);

        const rawViolations = (statsData.programs_with_violations || []).map(p => ({
          dept: p.program || p.dept || "Academic Dept",
          count: (p.violations || 0) + (p.late || 0) || p.count || 0,
          late: p.late || 0,
          violations: p.violations || 0,
        }));
        setTopViolatingDepartments(rawViolations);

        const nextViolatingStudents = statsData.violating_students || [];
        setViolatingStudents(nextViolatingStudents);

        const nextEqInv = statsData.equipment_inventory || { total_active: 0, available: 0, damaged: 0, lost: 0, released: 0, disabled: 0 };
        setEquipmentInventory(nextEqInv);

        const nextRecentChanges = statsData.recent_inventory_changes || [];
        setRecentInventoryChanges(nextRecentChanges);

        nextCachePayload = {
          totalVenueBookings: nextTotalVb,
          pendingApproval: nextPendingApp,
          pendingEquipBorrowings: nextPendingEb,
          totalEquipBorrows: nextTotalEb,
          totalDamaged: nextDamaged,
          totalLost: nextLost,
          topLateDepartment: nextTopLate,
          equipmentInventory: nextEqInv,
          recentInventoryChanges: nextRecentChanges,
          topBookedDepartments: finalDepts,
          mostUsedEquipment: nextTopEquip,
          topViolatingDepartments: rawViolations,
          violatingStudents: nextViolatingStudents,
        };
      }

      // Process and merge venue bookings
      let rawV = [];
      if (vRes.status === "fulfilled") {
        rawV = vRes.value.data?.data ?? (Array.isArray(vRes.value.data) ? vRes.value.data : []);
        try {
          sessionStorage.setItem("fsuu_cache_venue_bookings", JSON.stringify(rawV));
        } catch {}
      }
      const vMap = new Map();
      if (statsData?.today_reservations?.venues) {
        statsData.today_reservations.venues.forEach((v) => vMap.set(String(v.id), v));
      }
      rawV.forEach((v) => {
        const id = String(v.id);
        const existing = vMap.get(id) || {};
        vMap.set(id, { ...existing, ...v });
      });
      const mergedVenues = Array.from(vMap.values());
      setVenueBookings(mergedVenues);

      // Process and merge equipment borrowings
      let rawE = [];
      if (eRes.status === "fulfilled") {
        rawE = eRes.value.data?.data ?? (Array.isArray(eRes.value.data) ? eRes.value.data : []);
        try {
          sessionStorage.setItem("fsuu_cache_equip_borrowings", JSON.stringify(rawE));
        } catch {}
      }
      const eMap = new Map();
      if (statsData?.today_reservations?.equipment) {
        statsData.today_reservations.equipment.forEach((e) => eMap.set(String(e.id), e));
      }
      rawE.forEach((e) => {
        const id = String(e.id);
        const existing = eMap.get(id) || {};
        eMap.set(id, { ...existing, ...e });
      });
      const mergedEquip = Array.from(eMap.values());
      setEquipBorrowings(mergedEquip);

      if (Object.keys(nextCachePayload).length > 0) {
        try {
          localStorage.setItem("fsuu_cache_admin_dashboard", JSON.stringify({
            ...nextCachePayload,
            venueBookings: mergedVenues.slice(0, 30),
            equipBorrowings: mergedEquip.slice(0, 30),
          }));
        } catch {}
      }
    } catch {
      if (!isSilent) setError("Unable to sync dashboard data.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [cachedData]);

  useRealtimeSync(fetchData, {
    interval: 25000,
    customEvents: [
      "venue_bookings_updated",
      "equipment_borrowings_updated",
      "booking_status_updated",
      "fsuu_booking_created",
      "equipment_inventory_updated",
    ],
  });

  const handleRefresh = useCallback(() => fetchData(false), [fetchData]);

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
    <Suspense fallback={null}>
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
    </Suspense>
  );
}
