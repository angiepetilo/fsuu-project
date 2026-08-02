import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import {
  Loader2, RefreshCw, AlertCircle, Eye, Building2
} from "lucide-react";
import VenueBookingDetailModal from "./components/VenueBookingDetailModal";
import { PageLoader } from "@/components/ui/page-loader";

function StatusBadge({ status }) {
  const map = {
    pending: "bg-amber-100 text-amber-700 border border-amber-200",
    approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    "on-going": "bg-blue-100 text-blue-700 border border-blue-200",
    ongoing: "bg-blue-100 text-blue-700 border border-blue-200",
    completed: "bg-purple-100 text-purple-700 border border-purple-200",
    rejected: "bg-rose-100 text-rose-700 border border-rose-200",
    cancelled: "bg-slate-100 text-slate-600 border border-slate-200",
    "post-inspection": "bg-indigo-100 text-indigo-700 border border-indigo-200",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

const formatDate = (rawDate) => {
  if (!rawDate) return "—";
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(rawDate);
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return "08:00 AM";
  if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const formatTimeRange = (start, end) => {
  if (!start && !end) return "8:00 AM - 12:00 PM";
  return `${formatTime(start)} - ${formatTime(end)}`;
};

export default function VenueBookings() {
  const context = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // Item 12: "all" | "pending" | "ongoing" | "post-inspection"

  // Detail Modal State
  const [selected, setSelected] = useState(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionComments, setRejectionComments] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Inspection State
  const [inspectionStatus, setInspectionStatus] = useState("clean");
  const [evidencePhoto, setEvidencePhoto] = useState(null);
  const [violationNotes, setViolationNotes] = useState("");
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyReason, setNotifyReason] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/avr-venue-bookings");
      const data = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setBookings(data);
    } catch {
      setError("Unable to sync venue bookings data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  // Filter active reservations (completed/rejected/cancelled transfer directly to History Log)
  const filteredBookings = bookings.filter(b => {
    const s = (b.status || b.tracking_number?.status || "").toLowerCase();
    return s !== "completed" && s !== "rejected" && s !== "cancelled";
  });

  const handleAction = async (bookingId, action, customData = {}) => {
    setActionLoading(`${bookingId}-${action}`);
    try {
      let endpoint = `/avr-venue-bookings/${bookingId}/${action}`;
      const payload = { ...customData };
      if (action === "reject" && rejectionComments) {
        payload.rejection_reason = rejectionComments;
      }
      await api.post(endpoint, payload);
      setFeedbackMessage(`✅ Reservation request ${action}ed successfully!`);
      fetchBookings();
      setTimeout(() => {
        setSelected(null);
        setFeedbackMessage(null);
      }, 1200);
    } catch (err) {
      alert(err.response?.data?.message ?? "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && bookings.length === 0) return <PageLoader message="Loading Venue Bookings..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-blue-600" size={24} />
            Venue Bookings Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage venue reservation requests for {officeScope}.
          </p>
        </div>
        <button
          onClick={fetchBookings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60 shadow-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold">
          <AlertCircle size={18} />{error}
        </div>
      )}



      {/* Item 12 Table: [#, track number, requestor, department, Venue, Date, Time, Status, Action] */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["#", "Track Number", "Requestor", "Department", "Venue", "Date", "Time", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-semibold">
                    <Loader2 size={20} className="animate-spin inline mr-2" /> Loading venue bookings...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-semibold">
                    No venue bookings found under status filter "{statusFilter}".
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b, idx) => {
                  const refCode = b.tracking_number?.reference_code || b.reference_code || `TRK-AVR${b.id}`;
                  const requestor = b.filer_name || b.requestor_name || "—";
                  const department = b.program_office || b.department || "—";
                  const venueName = b.venue?.name || b.venue_name || "AVR Auditorium";
                  const usageDate = formatDate(b.date_of_usage || b.start_datetime);
                  const timeRange = formatTimeRange(b.time_start, b.time_end);
                  const currentStatus = b.status || b.tracking_number?.status || "pending";

                  return (
                    <tr key={b.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                        {refCode}
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{requestor}</td>
                      <td className="px-4 py-3.5 text-slate-700">{department}</td>
                      <td className="px-4 py-3.5 font-bold text-blue-700">{venueName}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{usageDate}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{timeRange}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={currentStatus} />
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setSelected(b)}
                          title="View Details"
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Items 13, 14 & Item 35 (Clean White Header) */}
      <VenueBookingDetailModal
        selected={selected}
        setSelected={setSelected}
        formatDate={formatDate}
        formatTimeRange={formatTimeRange}
        feedbackMessage={feedbackMessage}
        showRejectForm={showRejectForm}
        setShowRejectForm={setShowRejectForm}
        rejectionComments={rejectionComments}
        setRejectionComments={setRejectionComments}
        handleAction={handleAction}
        actionLoading={actionLoading}
        inspectionStatus={inspectionStatus}
        setInspectionStatus={setInspectionStatus}
        violationNotes={violationNotes}
        setViolationNotes={setViolationNotes}
        evidencePhoto={evidencePhoto}
        setEvidencePhoto={setEvidencePhoto}
        showNotifyModal={showNotifyModal}
        setShowNotifyModal={setShowNotifyModal}
        notifyReason={notifyReason}
        setNotifyReason={setNotifyReason}
      />
    </div>
  );
}
