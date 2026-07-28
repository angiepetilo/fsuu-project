import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import { MetricCard, ContentCard } from "@/components/ui/app-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Building2, PackageOpen, Clock, CheckCircle,
  ArrowRight, RefreshCw, AlertCircle, Calendar, ShieldCheck, Building
} from "lucide-react";

export default function Dashboard() {
  const context = useOutletContext();
  const selectedOffice = context?.selectedOffice ?? "All Offices";
  const setSelectedOffice = context?.setSelectedOffice;

  const [venueBookings, setVenueBookings] = useState([]);
  const [equipmentBorrowings, setEquipmentBorrowings] = useState([]);
  const [timeRange, setTimeRange] = useState("Today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vbRes, ebRes] = await Promise.all([
        api.get("/avr-venue-bookings").catch(() => ({ data: { data: [] } })),
        api.get("/avr-equipment-borrowings").catch(() => ({ data: { data: [] } })),
      ]);
      setVenueBookings(vbRes.data?.data ?? []);
      setEquipmentBorrowings(ebRes.data?.data ?? []);
    } catch (err) {
      setError("Unable to sync dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalVenue     = venueBookings.length;
  const pendingVenue   = venueBookings.filter(b => (b.status || "").toLowerCase() === "pending").length;
  const approvedVenue  = venueBookings.filter(b => (b.status || "").toLowerCase() === "approved").length;
  const totalEquipment = equipmentBorrowings.length;

  return (
    <div className="space-y-8">

      {/* Top Header & Time-Range / Office Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-slate-800 tracking-tight">Overview Dashboard</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Real-time snapshot of venue reservations, equipment borrows, and branch activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Pill Filters */}
          <div className="bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-1">
            {["Today", "This Week", "This Month", "This Year"].map((range) => {
              const active = timeRange === range;
              return (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`
                    px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150
                    ${active
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }
                  `}
                >
                  {range}
                </button>
              );
            })}
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200/80 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-xs disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold shadow-xs">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="TOTAL VENUE BOOKINGS"
          value={loading ? "..." : totalVenue}
          subtitle="All recorded reservations"
          trend
          icon={Building2}
        />
        <MetricCard
          title="PENDING APPROVALS"
          value={loading ? "..." : pendingVenue}
          subtitle="Requires staff action"
          icon={Clock}
        />
        <MetricCard
          title="APPROVED RESERVATIONS"
          value={loading ? "..." : approvedVenue}
          subtitle="Confirmed bookings"
          trend
          icon={CheckCircle}
        />
        <MetricCard
          title="EQUIPMENT BORROWS"
          value={loading ? "..." : totalEquipment}
          subtitle="Active equipment requests"
          trend
          icon={PackageOpen}
        />
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Recent Venue Bookings */}
        <ContentCard
          title="Recent Venue Bookings"
          subtitle="Latest submitted venue reservations"
          action={
            <Link
              to="/admin/venue-bookings"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight size={14} />
            </Link>
          }
          className="p-0"
        >
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-xs font-semibold">Loading venue bookings...</div>
            ) : venueBookings.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs font-semibold">No venue bookings recorded yet.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Filer Name</th>
                    <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Venue</th>
                    <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Date of Usage</th>
                    <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {venueBookings.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 truncate max-w-[140px]">
                        {b.filer_name || b.requestor_name || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-semibold truncate max-w-[130px]">
                        {b.venue?.name || b.venue_id || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-medium">
                        {b.date_of_usage ? new Date(b.date_of_usage).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={b.status || "pending"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </ContentCard>

        {/* Recent Equipment Borrows */}
        <ContentCard
          title="Recent Equipment Borrows"
          subtitle="Latest equipment requests"
          action={
            <Link
              to="/admin/equipment-borrowing"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight size={14} />
            </Link>
          }
          className="p-0"
        >
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-xs font-semibold">Loading equipment borrows...</div>
            ) : equipmentBorrowings.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs font-semibold">No equipment borrowing requests yet.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Filer Name</th>
                    <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Purpose</th>
                    <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Date</th>
                    <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipmentBorrowings.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 truncate max-w-[140px]">
                        {b.filer_name || b.requestor_name || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-semibold truncate max-w-[160px]">
                        {b.purpose || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-medium">
                        {b.date_of_usage ? new Date(b.date_of_usage).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={b.status || "pending"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </ContentCard>
      </div>

    </div>
  );
}
