import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/axios";
import {
  Building2, PackageOpen, Clock, CheckCircle, XCircle,
  TrendingUp, Users, ArrowRight, RefreshCw, AlertCircle
} from "lucide-react";

function StatCard({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-slate-100 rounded-lg animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-extrabold text-slate-900">{value ?? "—"}</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:  "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    cancelled:"bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [venueBookings, setVenueBookings] = useState([]);
  const [equipmentBorrowings, setEquipmentBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vbRes, ebRes] = await Promise.all([
        api.get("/avr-venue-bookings"),
        api.get("/avr-equipment-borrowings"),
      ]);
      setVenueBookings(vbRes.data?.data ?? []);
      setEquipmentBorrowings(ebRes.data?.data ?? []);
    } catch (err) {
      setError("Failed to load dashboard data. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const totalVenue     = venueBookings.length;
  const pendingVenue   = venueBookings.filter(b => b.status === "pending").length;
  const approvedVenue  = venueBookings.filter(b => b.status === "approved").length;
  const totalEquipment = equipmentBorrowings.length;

  return (
    <div className="space-y-7">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Overview of all bookings and requests</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Venue Bookings"     value={totalVenue}     icon={Building2}    color="bg-blue-600"   loading={loading} />
        <StatCard label="Pending Approval"   value={pendingVenue}   icon={Clock}        color="bg-amber-500"  loading={loading} />
        <StatCard label="Approved"           value={approvedVenue}  icon={CheckCircle}  color="bg-emerald-500"loading={loading} />
        <StatCard label="Equipment Requests" value={totalEquipment} icon={PackageOpen}  color="bg-purple-600" loading={loading} />
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Recent Venue Bookings */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" />
              <h2 className="font-bold text-slate-900 text-sm">Recent Venue Bookings</h2>
            </div>
            <Link to="/admin/venue-bookings" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
            ) : venueBookings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No venue bookings yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Requestor</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Venue</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {venueBookings.slice(0, 6).map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800 truncate max-w-[120px]">{b.requestor_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[120px]">{b.venue?.name ?? b.venue_id ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Equipment Borrowings */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PackageOpen size={16} className="text-purple-600" />
              <h2 className="font-bold text-slate-900 text-sm">Recent Equipment Borrowings</h2>
            </div>
            <Link to="/admin/equipment-borrowing" className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
            ) : equipmentBorrowings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No equipment borrowings yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Requestor</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Purpose</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {equipmentBorrowings.slice(0, 6).map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800 truncate max-w-[120px]">{b.requestor_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[120px]">{b.purpose?.substring(0, 40) ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
