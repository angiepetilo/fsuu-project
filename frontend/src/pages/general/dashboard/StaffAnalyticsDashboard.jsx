import { Link } from "react-router-dom";
import {
  AlertCircle,
  Package,
  Wrench,
  AlertTriangle,
  Ban,
  Zap,
  Clock,
  Activity,
  GraduationCap,
  Users,
  User,
} from "lucide-react";
import MetricsOverview from "./MetricsOverview";
import TodayReservationsSection from "./TodayReservationsSection";

function InventoryBar({ label, value, total, color, icon: Icon }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color.bg}`}>
        <Icon size={13} className={color.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[11px] font-bold mb-1">
          <span className="text-foreground/80">{label}</span>
          <span className={color.text}>{value}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const ACTION_STYLES = {
  EQUIPMENT_UNIT_UPDATED:       { label: "Updated",     cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800" },
  EQUIPMENT_UNIT_CREATED:       { label: "Added",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800" },
  EQUIPMENT_UNIT_DELETED:       { label: "Disabled",    cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800" },
  EQUIPMENT_UNIT_ENABLED:       { label: "Re-enabled",  cls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800" },
  EQUIPMENT_UNIT_BATCH_CREATED: { label: "Batch Added", cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/70 dark:text-violet-300 dark:border-violet-800" },
  EQUIPMENT_UNIT_BULK_IMPORTED: { label: "Imported",    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800" },
};

export default function StaffAnalyticsDashboard({
  loading = false,
  error = null,
  onRefresh,
  canQuickVenue = true,
  canQuickEquipment = true,
  canMetrics = true,
  canAnalytics = true,
  canInventoryStatus = true,
  canInventoryChanges = true,
  canLateReturns = true,
  canTodayReservations = true,
  totalVenueBookings = 0,
  pendingApproval = 0,
  postInspectionPending = 0,
  totalEquipBorrows = 0,
  totalDamaged = 0,
  totalLost = 0,
  equipmentInventory = {},
  recentInventoryChanges = [],
  topBookedDepartments = [],
  mostUsedEquipment = [],
  topViolatingDepartments = [],
  topLateDepartment = "None",
  violatingStudents = [],
  venueBookings = [],
  equipBorrowings = [],
  isSysadRoute = false,
}) {
  const inv = equipmentInventory || {};
  const total = inv.total_active || 1;

  const hasAnySection =
    canQuickVenue ||
    canQuickEquipment ||
    canMetrics ||
    canAnalytics ||
    canInventoryStatus ||
    canInventoryChanges ||
    canLateReturns ||
    canTodayReservations;

  return (
    <div className="space-y-6">

      {error && (
        <div className="py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* ── 1. Quick Actions Interface (Venue Booking / Equipment Borrowing) ── */}
      {(canQuickVenue || canQuickEquipment) && (
        <div className={`grid grid-cols-1 ${canQuickVenue && canQuickEquipment ? "sm:grid-cols-2" : ""} gap-4`}>
          {canQuickVenue && (
            <Link
              to="/interface/venue"
              className="group bg-card hover:bg-muted/30 border border-border hover:border-primary/50 rounded-2xl p-5 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    Book Venue Interface
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Reserve campus facilities, AVRs, webcast studios, or auditoriums with walk-in filing.
                  </p>
                </div>

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

          {canQuickEquipment && (
            <Link
              to="/interface/equipment"
              className="group bg-card hover:bg-muted/30 border border-border hover:border-emerald-500/50 rounded-2xl p-5 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Borrow Equipment Interface
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Borrow audiovisual equipment, projectors, wireless microphones, and accessories.
                  </p>
                </div>

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

      {/* ── 2. Overview Counters [Venue Bookings, Pending Approval, Post Inspection, Equipment Borrows, Damaged, Lost] ── */}
      {canMetrics && (
        <MetricsOverview
          totalVenueBookings={totalVenueBookings}
          pendingApproval={pendingApproval}
          postInspectionPending={postInspectionPending}
          totalEquipBorrows={totalEquipBorrows}
          totalDamaged={totalDamaged}
          totalLost={totalLost}
        />
      )}

      {/* ── 3. Analytics Cards [Top Dept Bookings, Most Borrowed Equip, Dept Violations, Top Late Return Dept] ── */}
      {canAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex flex-col space-y-3">
            <div className="border-b border-border pb-2">
              <h3 className="font-extrabold text-foreground text-xs tracking-tight">Top Department Bookings</h3>
            </div>
            <div className="space-y-2.5 my-auto">
              {topBookedDepartments.slice(0, 4).map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg hover:bg-muted">
                  <span className="text-foreground/90 truncate max-w-[160px]">{d.name}</span>
                  <span className="font-mono font-bold text-blue-600 text-[11px]">{d.count}</span>
                </div>
              ))}
              {topBookedDepartments.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No booking records.</p>}
            </div>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex flex-col space-y-3">
            <div className="border-b border-border pb-2">
              <h3 className="font-extrabold text-foreground text-xs tracking-tight">Most Borrowed Equipment</h3>
            </div>
            <div className="space-y-2 my-auto">
              {mostUsedEquipment.slice(0, 4).map((eq, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg hover:bg-muted">
                  <span className="text-foreground/90 truncate max-w-[140px]">{eq.name}</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded text-[11px]">{eq.count}</span>
                </div>
              ))}
              {mostUsedEquipment.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No equipment borrow data.</p>}
            </div>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex flex-col space-y-3">
            <div className="border-b border-border pb-2">
              <h3 className="font-extrabold text-foreground text-xs tracking-tight">Department Violations</h3>
            </div>
            <div className="space-y-2 my-auto">
              {topViolatingDepartments.slice(0, 4).map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg hover:bg-muted">
                  <span className="text-foreground/90 truncate max-w-[140px]">{v.dept}</span>
                  <span className="font-mono font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded text-[11px]">{v.count}</span>
                </div>
              ))}
              {topViolatingDepartments.length === 0 && (
                <div className="text-center py-4 text-emerald-600 dark:text-emerald-400 font-bold text-xs">● Clean Record</div>
              )}
            </div>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex flex-col space-y-3">
            <div className="border-b border-border pb-2">
              <h3 className="font-extrabold text-foreground text-xs tracking-tight">Top Late Return Dept.</h3>
            </div>
            <div className="flex flex-col items-center justify-center py-4 my-auto text-center">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">{topLateDepartment}</span>
              <span className="text-[11px] text-muted-foreground font-semibold mt-1">Most frequent late check-ins</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Equipment Inventory Status & Recent Inventory Changes ── */}
      {(canInventoryStatus || canInventoryChanges) && (
        <div className={`grid grid-cols-1 ${canInventoryStatus && canInventoryChanges ? "lg:grid-cols-2" : ""} gap-4`}>
          {canInventoryStatus && (
            <div className="bg-card rounded-2xl border border-border shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 flex items-center justify-center">
                    <Activity size={14} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-extrabold text-foreground text-xs sm:text-sm">Equipment Inventory Status</h3>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground bg-muted border border-border px-2.5 py-0.5 rounded-full">
                  {inv.total_active ?? 0} Active Units
                </span>
              </div>
              <div className="space-y-3">
                <InventoryBar label="Available" value={inv.available ?? 0} total={total} icon={Package}
                  color={{ bg: "bg-emerald-50 dark:bg-emerald-950/50", icon: "text-emerald-600 dark:text-emerald-400", text: "text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" }} />
                <InventoryBar label="Released / In-Use" value={inv.released ?? 0} total={total} icon={Zap}
                  color={{ bg: "bg-blue-50 dark:bg-blue-950/50", icon: "text-blue-600 dark:text-blue-400", text: "text-blue-700 dark:text-blue-300", bar: "bg-blue-500" }} />
                <InventoryBar label="Damaged / Under Repair" value={inv.damaged ?? 0} total={total} icon={Wrench}
                  color={{ bg: "bg-amber-50 dark:bg-amber-950/50", icon: "text-amber-600 dark:text-amber-400", text: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500" }} />
                <InventoryBar label="Lost / Decommissioned" value={inv.lost ?? 0} total={total} icon={AlertTriangle}
                  color={{ bg: "bg-rose-50 dark:bg-rose-950/50", icon: "text-rose-500 dark:text-rose-400", text: "text-rose-700 dark:text-rose-300", bar: "bg-rose-500" }} />
                <InventoryBar label="Disabled" value={inv.disabled ?? 0} total={Math.max(total + (inv.disabled ?? 0), 1)} icon={Ban}
                  color={{ bg: "bg-muted", icon: "text-muted-foreground", text: "text-muted-foreground", bar: "bg-muted-foreground/50" }} />
              </div>
            </div>
          )}

          {canInventoryChanges && (
            <div className="bg-card rounded-2xl border border-border shadow-2xs p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-100 dark:border-violet-900 flex items-center justify-center">
                    <Clock size={14} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="font-extrabold text-foreground text-xs sm:text-sm">Recent Inventory Changes</h3>
                </div>
                <span className="text-[11px] font-bold text-violet-700 bg-violet-50 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-900 px-2.5 py-0.5 rounded-full">
                  {recentInventoryChanges.length} Events
                </span>
              </div>
              <div className="space-y-1.5 overflow-y-auto max-h-[280px] pr-1">
                {recentInventoryChanges.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground font-semibold">No inventory changes recorded yet.</p>
                ) : (
                  recentInventoryChanges.map((change) => {
                    const style = ACTION_STYLES[change.action] ?? { label: change.label, cls: "bg-muted text-muted-foreground border-border" };
                    return (
                      <div key={change.id} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-muted transition-colors">
                        <span className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap shrink-0 ${style.cls}`}>
                          {style.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11.5px] font-semibold text-foreground/90 leading-snug break-words" title={change.trigger}>
                            {change.trigger}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {change.barcode && (
                              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded">
                                {change.barcode}
                              </span>
                            )}
                            {change.condition && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                change.condition.toLowerCase() === "good" ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" :
                                change.condition.toLowerCase() === "damaged" ? "bg-amber-50 text-amber-700 border-amber-200/60" :
                                "bg-rose-50 text-rose-700 border-rose-200/60"
                              }`}>
                                {change.condition}
                              </span>
                            )}
                            {change.status && (
                              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">
                                {change.status}
                              </span>
                            )}
                            {change.count && (
                              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                Qty: {change.count}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-semibold whitespace-nowrap shrink-0 mt-0.5">{change.created_at}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. Borrowers with Late Returns ── */}
      {canLateReturns && (
        <div className="bg-card rounded-2xl border border-border shadow-2xs p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-extrabold text-foreground text-xs sm:text-sm">Borrowers with late returns</h3>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 px-2.5 py-0.5 rounded-full">
              {violatingStudents.length} Incidents
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="pb-2.5 px-3">BORROWER</th>
                  <th className="pb-2.5 px-3">DEPARTMENT</th>
                  <th className="pb-2.5 px-3">TRACKING NO.</th>
                  <th className="pb-2.5 px-3">TYPE</th>
                  <th className="pb-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-semibold">
                {violatingStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-emerald-600 dark:text-emerald-400 font-bold">
                      ✓ No active student violations or late returns recorded.
                    </td>
                  </tr>
                ) : (
                  violatingStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/60 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-foreground">{s.name}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{s.department}</td>
                      <td className="py-2.5 px-3 font-mono text-foreground">{s.reference_code}</td>
                      <td className="py-2.5 px-3 text-foreground/80">{s.type}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.is_late ? "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800" : "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800"
                        }`}>
                          {s.violation}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. Today's Scheduled Reservations ── */}
      {canTodayReservations && (
        <TodayReservationsSection
          venueBookings={venueBookings}
          equipBorrowings={equipBorrowings}
          loading={loading}
          isSysadRoute={isSysadRoute}
        />
      )}

      {/* Empty Fallback State if no widgets permitted */}
      {!hasAnySection && (
        <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-2">
          <h3 className="text-sm font-bold text-foreground">Welcome to your Dashboard</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No specific dashboard widgets have been enabled for your account role. Please contact a Super Administrator if you need access to particular dashboard metrics or shortcuts.
          </p>
        </div>
      )}
    </div>
  );
}
