import { RefreshCw, AlertCircle, Package, Wrench, AlertTriangle, Ban, Zap, Clock, Activity } from "lucide-react";
import MetricsOverview from "./MetricsOverview";

function InventoryBar({ label, value, total, color, icon: Icon }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color.bg}`}>
        <Icon size={13} className={color.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[11px] font-bold mb-1">
          <span className="text-slate-700">{label}</span>
          <span className={color.text}>{value}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
  EQUIPMENT_UNIT_UPDATED:       { label: "Updated",     cls: "bg-blue-50 text-blue-700 border-blue-200" },
  EQUIPMENT_UNIT_CREATED:       { label: "Added",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  EQUIPMENT_UNIT_DELETED:       { label: "Disabled",    cls: "bg-rose-50 text-rose-700 border-rose-200" },
  EQUIPMENT_UNIT_ENABLED:       { label: "Re-enabled",  cls: "bg-teal-50 text-teal-700 border-teal-200" },
  EQUIPMENT_UNIT_BATCH_CREATED: { label: "Batch Added", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  EQUIPMENT_UNIT_BULK_IMPORTED: { label: "Imported",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function StaffAnalyticsDashboard({
  loading = false,
  error = null,
  onRefresh,
  totalVenueBookings = 0,
  pendingApproval = 0,
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
}) {
  const inv = equipmentInventory;
  const total = inv.total_active || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-xs shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>{loading ? "Syncing..." : "Refresh"}</span>
        </button>
      </div>

      {error && (
        <div className="py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 bg-rose-50">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      <MetricsOverview
        totalVenueBookings={totalVenueBookings}
        pendingApproval={pendingApproval}
        totalEquipBorrows={totalEquipBorrows}
        totalDamaged={totalDamaged}
        totalLost={totalLost}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">Top Department Bookings</h3>
          </div>
          <div className="space-y-2.5 my-auto">
            {topBookedDepartments.slice(0, 4).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg hover:bg-slate-50">
                <span className="text-slate-800 truncate max-w-[160px]">{d.name}</span>
                <span className="font-mono font-bold text-blue-600 text-[11px]">{d.count}</span>
              </div>
            ))}
            {topBookedDepartments.length === 0 && <p className="text-center text-xs text-slate-400 py-4">No booking records.</p>}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">Most Borrowed Equipment</h3>
          </div>
          <div className="space-y-2 my-auto">
            {mostUsedEquipment.slice(0, 4).map((eq, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg hover:bg-slate-50">
                <span className="text-slate-800 truncate max-w-[140px]">{eq.name}</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">{eq.count}</span>
              </div>
            ))}
            {mostUsedEquipment.length === 0 && <p className="text-center text-xs text-slate-400 py-4">No equipment borrow data.</p>}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">Department Violations</h3>
          </div>
          <div className="space-y-2 my-auto">
            {topViolatingDepartments.slice(0, 4).map((v, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg hover:bg-slate-50">
                <span className="text-slate-800 truncate max-w-[140px]">{v.dept}</span>
                <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">{v.count}</span>
              </div>
            ))}
            {topViolatingDepartments.length === 0 && (
              <div className="text-center py-4 text-emerald-600 font-bold text-xs">● Clean Record</div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">Top Late Return Dept.</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-4 my-auto text-center">
            <span className="text-xl font-black text-amber-600">{topLateDepartment}</span>
            <span className="text-[11px] text-slate-500 font-semibold mt-1">Most frequent late check-ins</span>
          </div>
        </div>
      </div>

      {/* Equipment Inventory Status + Recent Changes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Inventory Status */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Activity size={14} className="text-blue-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Equipment Inventory Status</h3>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full">
              {inv.total_active ?? 0} Active Units
            </span>
          </div>
          <div className="space-y-3">
            <InventoryBar label="Available" value={inv.available ?? 0} total={total} icon={Package}
              color={{ bg: "bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-700", bar: "bg-emerald-500" }} />
            <InventoryBar label="Released / In-Use" value={inv.released ?? 0} total={total} icon={Zap}
              color={{ bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-700", bar: "bg-blue-500" }} />
            <InventoryBar label="Damaged / Under Repair" value={inv.damaged ?? 0} total={total} icon={Wrench}
              color={{ bg: "bg-amber-50", icon: "text-amber-600", text: "text-amber-700", bar: "bg-amber-500" }} />
            <InventoryBar label="Lost / Decommissioned" value={inv.lost ?? 0} total={total} icon={AlertTriangle}
              color={{ bg: "bg-rose-50", icon: "text-rose-500", text: "text-rose-700", bar: "bg-rose-500" }} />
            <InventoryBar label="Disabled" value={inv.disabled ?? 0} total={Math.max(total + (inv.disabled ?? 0), 1)} icon={Ban}
              color={{ bg: "bg-slate-100", icon: "text-slate-400", text: "text-slate-500", bar: "bg-slate-400" }} />
          </div>
        </div>

        {/* Recent Inventory Changes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                <Clock size={14} className="text-violet-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Recent Inventory Changes</h3>
            </div>
            <span className="text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-full">
              {recentInventoryChanges.length} Events
            </span>
          </div>
          <div className="space-y-1.5 overflow-y-auto max-h-[280px] pr-1">
            {recentInventoryChanges.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400 font-semibold">No inventory changes recorded yet.</p>
            ) : (
              recentInventoryChanges.map((change) => {
                const style = ACTION_STYLES[change.action] ?? { label: change.label, cls: "bg-slate-50 text-slate-600 border-slate-200" };
                return (
                  <div key={change.id} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap shrink-0 ${style.cls}`}>
                      {style.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11.5px] font-semibold text-slate-800 leading-snug break-words" title={change.trigger}>
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
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded capitalize">
                            {change.status}
                          </span>
                        )}
                        {change.count && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            Qty: {change.count}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap shrink-0 mt-0.5">{change.created_at}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Borrowers with Late Returns */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Borrowers with late returns</h3>
          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
            {violatingStudents.length} Incidents
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-2.5 px-3">BORROWER</th>
                <th className="pb-2.5 px-3">DEPARTMENT</th>
                <th className="pb-2.5 px-3">TRACKING NO.</th>
                <th className="pb-2.5 px-3">TYPE</th>
                <th className="pb-2.5 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {violatingStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-emerald-600 font-bold">
                    ✓ No active student violations or late returns recorded.
                  </td>
                </tr>
              ) : (
                violatingStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.department}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-900">{s.reference_code}</td>
                    <td className="py-2.5 px-3 text-slate-700">{s.type}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.is_late ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-rose-100 text-rose-800 border border-rose-200"
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
    </div>
  );
}
