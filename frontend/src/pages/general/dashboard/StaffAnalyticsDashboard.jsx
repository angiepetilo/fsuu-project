import { RefreshCw, AlertCircle } from "lucide-react";
import MetricsOverview from "./MetricsOverview";
import BookingCalendar from "./BookingCalendar";

const DEPT_BG_COLORS = ["bg-blue-600", "bg-emerald-600", "bg-amber-500", "bg-purple-600", "bg-cyan-600"];

export default function StaffAnalyticsDashboard({
  loading = false,
  error = null,
  onRefresh,
  totalVenueBookings = 0,
  pendingApproval = 0,
  totalEquipBorrows = 0,
  totalDamaged = 0,
  totalLost = 0,
  topBookedDepartments = [],
  mostUsedEquipment = [],
  topViolatingDepartments = [],
  topLateDepartment = "None",
  violatingStudents = [],
  monthLabel,
  prevMonth,
  nextMonth,
  firstDayOfWeek,
  daysInMonth,
  getDayDetails,
  calMonth,
  setCalMonth,
  calYear,
  setCalYear,
}) {
  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Executive Operations & Analytics</h2>
          <p className="text-xs text-slate-500 font-medium">Facility utilization metrics, borrower violations, and campus reservations.</p>
        </div>
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

      {/* 5 Top Stat Cards with Semantic Values and Accents */}
      <MetricsOverview
        totalVenueBookings={totalVenueBookings}
        pendingApproval={pendingApproval}
        totalEquipBorrows={totalEquipBorrows}
        totalDamaged={totalDamaged}
        totalLost={totalLost}
      />

      {/* 4 Analytics Breakdown Widgets: Department Bookings | Equipment | Violations | Late Returns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Department with Most Bookings & Borrowings */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">
              Top Department Bookings
            </h3>
          </div>

          <div className="space-y-2.5 my-auto">
            {topBookedDepartments.slice(0, 4).map((d, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span className="truncate max-w-[140px]">{d.name}</span>
                  <span className="font-mono text-blue-600">{d.count} ({d.pct}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${DEPT_BG_COLORS[i % DEPT_BG_COLORS.length]}`} style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
            {topBookedDepartments.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-4">No booking records.</p>
            )}
          </div>
        </div>

        {/* 2. Top 5 Most Borrowed Equipment */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">
              Most Borrowed Equipment
            </h3>
          </div>

          <div className="space-y-2 my-auto">
            {mostUsedEquipment.slice(0, 4).map((eq, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg hover:bg-slate-50">
                <span className="text-slate-800 truncate max-w-[140px]">{eq.name}</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                  {eq.count}
                </span>
              </div>
            ))}
            {mostUsedEquipment.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-4">No equipment borrow data.</p>
            )}
          </div>
        </div>

        {/* 3. Department with Most Violations */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">
              Department with Most Violations
            </h3>
          </div>

          <div className="space-y-2 my-auto">
            {topViolatingDepartments.slice(0, 4).map((v, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg hover:bg-slate-50">
                <span className="text-slate-800 truncate max-w-[140px]">{v.dept}</span>
                <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                  {v.count} breaches
                </span>
              </div>
            ))}
            {topViolatingDepartments.length === 0 && (
              <div className="text-center py-4 text-emerald-600 font-bold text-xs">
                ● Clean Record
              </div>
            )}
          </div>
        </div>

        {/* 4. Department with Most Late Returns */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xs tracking-tight">
              Top Late Return Department
            </h3>
          </div>

          <div className="flex flex-col items-center justify-center p-4 my-auto text-center">
            <span className="text-2xl font-black text-amber-600">
              {topLateDepartment}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold mt-1">
              Highest tardiness frequency in equipment check-in
            </span>
          </div>
        </div>
      </div>

      {/* Schedule Calendar & Violators List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Students with Late Returns & Violations Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                Borrowers with late returns
              </h3>
            </div>
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
                  <th className="pb-2.5 px-3">VIOLATIONS</th>
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
                          s.is_late 
                            ? "bg-amber-100 text-amber-800 border border-amber-200" 
                            : "bg-rose-100 text-rose-800 border border-rose-200"
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

        {/* Right Column (5 cols): Interactive Booking Calendar */}
        <div className="lg:col-span-5">
          <BookingCalendar
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
        </div>
      </div>
    </div>
  );
}
