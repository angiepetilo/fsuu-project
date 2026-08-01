import { MetricCard, ContentCard } from "@/components/ui/app-card";
import { Building2, Clock, PackageOpen, AlertTriangle, AlertCircle } from "lucide-react";

export default function SysadMetricsGrid({
  loading,
  selectedOffice,
  totalVenueCount,
  pendingCount,
  totalEquipmentCount,
  damagedCount,
  lostCount,
  filteredTableRecords,
  topBookedDepartments,
}) {
  return (
    <>
      {/* 5 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="TOTAL VENUE BOOKINGS"
          value={loading ? "..." : String(totalVenueCount)}
          subtitle={`Combined venue reservations (${selectedOffice})`}
          trend
          icon={Building2}
        />
        <MetricCard
          title="PENDING APPROVAL"
          value={loading ? "..." : String(pendingCount)}
          subtitle="Requests awaiting admin action"
          icon={Clock}
        />
        <MetricCard
          title="TOTAL EQUIPMENT BORROWS"
          value={loading ? "..." : String(totalEquipmentCount)}
          subtitle={`Combined equipment loans (${selectedOffice})`}
          trend
          icon={PackageOpen}
        />
        <MetricCard
          title="TOTAL EQUIPMENT DAMAGES"
          value={loading ? "..." : String(damagedCount)}
          subtitle="Damaged gear reports logged"
          icon={AlertTriangle}
        />
        <MetricCard
          title="TOTAL EQUIPMENT LOST"
          value={loading ? "..." : String(lostCount)}
          subtitle="Lost & unreturned items"
          icon={AlertCircle}
        />
      </div>

      {/* Donut Pie Chart Card */}
      <ContentCard
        title="Departments with Most Venue Bookings (Across Branch Admins)"
        subtitle="Percentage distribution of venue reservation volume across university departments"
        className="p-4.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3 h-full flex flex-col justify-between"
      >
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4 bg-slate-50/60 p-3.5 rounded-xl border border-slate-200/60 my-auto">
          {/* Compact SVG Donut Chart */}
          <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                strokeWidth="3.8"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                stroke="#6366f1"
                strokeWidth="4"
                strokeDasharray="30, 100"
                strokeDashoffset="0"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                stroke="#3b82f6"
                strokeWidth="4"
                strokeDasharray="25, 100"
                strokeDashoffset="-30"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                stroke="#10b981"
                strokeWidth="4"
                strokeDasharray="20, 100"
                strokeDashoffset="-55"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                stroke="#f59e0b"
                strokeWidth="4"
                strokeDasharray="15, 100"
                strokeDashoffset="-75"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                stroke="#a855f7"
                strokeWidth="4"
                strokeDasharray="10, 100"
                strokeDashoffset="-90"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-slate-900 leading-none">{filteredTableRecords.length}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Bookings</span>
            </div>
          </div>

          {/* Pie Chart Legend Breakdown */}
          <div className="space-y-1.5 w-full max-w-xs">
            {topBookedDepartments.map((dept) => (
              <div key={dept.code} className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200/60 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                  <span className="font-extrabold text-slate-900">{dept.name}</span>
                </div>
                <div className="font-black text-slate-800 text-[11px]">
                  {dept.pct}% <span className="text-slate-400 font-medium">({dept.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ContentCard>
    </>
  );
}
