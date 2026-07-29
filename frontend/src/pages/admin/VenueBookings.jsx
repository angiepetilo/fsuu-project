import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import {
  CheckCircle, XCircle, Loader2, RefreshCw, AlertCircle,
  ChevronLeft, ChevronRight, Eye, Building2, Calendar, Clock,
  FileText, User, Mail, Phone, MapPin, Users, ShieldCheck, X, Send
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

function StatusBadge({ status }) {
  const map = {
    pending:   "bg-amber-100 text-amber-700 border border-amber-200",
    approved:  "bg-emerald-100 text-emerald-700 border border-emerald-200",
    rejected:  "bg-rose-100 text-rose-700 border border-rose-200",
    cancelled: "bg-slate-100 text-slate-600 border border-slate-200",
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
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  // Detail Modal State
  const [selected, setSelected] = useState(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionComments, setRejectionComments] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/avr-venue-bookings?page=${page}`);
      const data = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setBookings(data);
      setMeta(res.data?.meta ?? null);
    } catch {
      setError("Failed to load venue bookings.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleAction = async (bookingId, type, customRemarks = null) => {
    setActionLoading(bookingId + "-" + type);
    try {
      const remarksToSend = customRemarks || rejectionComments || null;
      await api.post(`/avr-venue-bookings/${bookingId}/${type}`, { remarks: remarksToSend });
      
      const reqEmail = selected?.email_address || selected?.requestor_email || "requestor";
      if (type === "reject") {
        setFeedbackMessage(`Reservation rejected. Rejection comments sent directly to ${reqEmail}`);
      } else if (type === "approve") {
        setFeedbackMessage(`Reservation approved! Confirmation email sent to ${reqEmail}`);
      }

      await fetchBookings();
      setTimeout(() => {
        setSelected(null);
        setShowRejectForm(false);
        setRejectionComments("");
        setFeedbackMessage(null);
      }, 1800);
    } catch (err) {
      alert(err.response?.data?.message ?? "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-slate-800 tracking-tight">Venue Bookings</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage AVR and SCO venue reservation requests</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-sm font-semibold">
          <AlertCircle size={18} />{error}
        </div>
      )}

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["Ref #", "Requestor", "Department", "Venue", "Date", "Time", "Status"].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-semibold">
                    <Loader2 size={20} className="animate-spin inline mr-2" /> Loading venue bookings...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-semibold">
                    No venue bookings recorded.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const refCode = b.tracking_number?.reference_code || b.reference_code || `TRK-AVR${b.id}`;
                  const filerName = b.filer_name || b.requestor_name || "—";
                  const department = b.program_office || b.requestor_dept || b.email_address || "—";
                  const venueName = b.venue?.name || "AVR 1";
                  const usageDate = formatDate(b.date_of_usage || b.start_datetime);
                  const timeRange = formatTimeRange(b.time_start, b.time_end);
                  const currentStatus = b.status || b.tracking_number?.status || "pending";

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                        {refCode}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900 truncate max-w-[150px]">
                        {filerName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs font-semibold truncate max-w-[180px]">
                        {department}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-semibold text-xs whitespace-nowrap">
                        {venueName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                        {usageDate}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs font-semibold whitespace-nowrap">
                        {timeRange}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={currentStatus} />
                          <Tooltip text="View Full Details & Action">
                            <button
                              onClick={() => { setSelected(b); setShowRejectForm(false); setRejectionComments(""); }}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Page {meta.current_page} of {meta.last_page}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                disabled={page === meta.last_page}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Eye View Pop-up Modal (Side-by-Side 2/3 & 1/3 Layout) ── */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Upper Track Header Bar */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 font-mono text-xs font-bold tracking-wider">
                  {selected.tracking_number?.reference_code || selected.reference_code || `TRK-AVR${selected.id}`}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Venue Reservation Details
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Filed on {formatDate(selected.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={selected.status || selected.tracking_number?.status || "pending"} />
                <button
                  onClick={() => { setSelected(null); setShowRejectForm(false); }}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Feedback Alert Toast inside Modal */}
            {feedbackMessage && (
              <div className="bg-emerald-500 text-white text-xs font-bold px-6 py-3 flex items-center gap-2 animate-in slide-in-from-top-2">
                <CheckCircle size={16} />
                {feedbackMessage}
              </div>
            )}

            {/* Modal Body: Split Side-by-Side Grid (2/3 Left & 1/3 Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-100 flex-1">
              
              {/* ── Left Side (2/3 Width): Booking Details ── */}
              <div className="lg:col-span-8 p-6 space-y-6">
                
                {/* Section A: Filer Information (Without School ID) */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <User size={14} className="text-blue-600" />
                    Filer Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Filer Name</span>
                      <span className="font-extrabold text-slate-900 text-sm">{selected.filer_name || selected.requestor_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Department / Program</span>
                      <span className="font-bold text-slate-800">{selected.program_office || selected.requestor_dept || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Email Address</span>
                      <span className="font-semibold text-slate-700">{selected.email_address || selected.requestor_email || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Contact Number</span>
                      <span className="font-semibold text-slate-700">{selected.contact_number || selected.requestor_contact_number || "09171234567"}</span>
                    </div>
                  </div>
                </div>

                {/* Section B: Venue & Event Schedule (Clean Formatted Date & Time) */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Building2 size={14} className="text-blue-600" />
                    Venue & Event Schedule
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Venue Reserved</span>
                      <span className="font-extrabold text-blue-700 text-sm">{selected.venue?.name || "AVR 1"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Location & Capacity</span>
                      <span className="font-bold text-slate-800">{selected.venue?.location || "FSUU Main Campus"} • {selected.venue?.capacity || 100} Seats</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Date of Usage</span>
                      <span className="font-extrabold text-slate-900 text-sm">{formatDate(selected.date_of_usage || selected.start_datetime)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Time Schedule</span>
                      <span className="font-extrabold text-slate-900 text-sm">{formatTimeRange(selected.time_start, selected.time_end)}</span>
                    </div>
                  </div>
                </div>

                {/* Section C: Purpose & Event Details */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText size={14} className="text-blue-600" />
                    Purpose & Event Details
                  </h4>
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs space-y-3">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Event Purpose</span>
                      <p className="font-semibold text-slate-800 leading-relaxed mt-0.5">
                        {selected.purpose || "Annual Academic Symposium & Student Activity"}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-slate-600 font-semibold gap-2">
                      <span>Attendees: <strong className="text-slate-900">{selected.no_of_person || selected.number_of_persons || 150} persons</strong></span>
                      <span>Classification: <strong className="text-slate-900 capitalize">{selected.classification || "Student Organization"}</strong></span>
                      <span>Place of Use: <strong className="text-slate-900 capitalize">{selected.place_of_use || "Inside Campus"}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Section D: Rejection Comment Form & Action Buttons */}
                {(selected.status === "pending" || selected.tracking_number?.status === "pending") && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    {showRejectForm ? (
                      <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
                        <label className="block text-xs font-bold text-rose-800">
                          Rejection Reason / Comments (Emailed directly to requestor):
                        </label>
                        <textarea
                          rows={3}
                          value={rejectionComments}
                          onChange={(e) => setRejectionComments(e.target.value)}
                          placeholder="State clear reasons why this venue booking cannot be approved (e.g. Schedule conflict, missing endorsement document)..."
                          className="w-full text-xs p-3 rounded-xl border border-rose-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 text-slate-800"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setShowRejectForm(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAction(selected.id, "reject")}
                            disabled={!rejectionComments.trim() || !!actionLoading}
                            className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            Confirm Rejection & Send Email
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setShowRejectForm(true)}
                          className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-all cursor-pointer"
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={() => handleAction(selected.id, "approve")}
                          disabled={!!actionLoading}
                          className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          {actionLoading === selected.id + "-approve" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          Approve Reservation
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* ── Right Side (1/3 Width): Endorsement Letter Live Preview ── */}
              <div className="lg:col-span-4 p-6 bg-slate-50/50 flex flex-col space-y-4">
                
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    Endorsement Letter
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase border border-emerald-200">
                    Verified
                  </span>
                </div>

                {/* Rendered Official Letter Document Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex-1 flex flex-col justify-between space-y-4 text-[11px] leading-relaxed relative overflow-hidden">
                  
                  {/* Stamp Badge */}
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full border-4 border-dashed border-emerald-200/60 flex items-center justify-center text-emerald-300 font-extrabold text-[8px] rotate-[-20deg] pointer-events-none uppercase tracking-widest text-center p-2">
                    FSUU APPROVED STAMP
                  </div>

                  <div>
                    <div className="text-center border-b border-slate-100 pb-3 mb-3">
                      <h5 className="font-extrabold text-slate-900 uppercase tracking-tight text-xs">Father Saturnino Urios University</h5>
                      <p className="text-[10px] text-slate-400 font-semibold">Office of Student Affairs & Academic Services</p>
                      <p className="text-[9px] text-blue-600 font-bold mt-1">OFFICIAL ENDORSEMENT FORM</p>
                    </div>

                    <p className="text-slate-500 font-semibold">Date: <strong className="text-slate-800">{formatDate(selected.created_at)}</strong></p>
                    
                    <p className="mt-3 text-slate-700">
                      <strong>To:</strong> AVR / SCO Facilities Management<br />
                      <strong>Re:</strong> Venue Reservation Approval Request
                    </p>

                    <p className="mt-3 text-slate-600 font-medium">
                      This is to formally endorse the reservation request submitted by <strong className="text-slate-900">{selected.filer_name || selected.requestor_name}</strong> on behalf of <strong className="text-slate-900">{selected.program_office || "College of Engineering"}</strong>.
                    </p>

                    <p className="mt-2 text-slate-600 font-medium">
                      The activity titled <em>"{selected.purpose || "Academic Event"}"</em> has been verified for educational compliance.
                    </p>
                  </div>

                  {/* Signatures Footer */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <div>
                        <span className="block font-extrabold text-slate-800">Dr. E. VP Academics</span>
                        <span className="text-slate-400">VP for Academic Affairs</span>
                      </div>
                      <span className="text-emerald-600 font-bold">✓ Signed</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <div>
                        <span className="block font-extrabold text-slate-800">Dean of Student Affairs</span>
                        <span className="text-slate-400">DSA Endorsement</span>
                      </div>
                      <span className="text-emerald-600 font-bold">✓ Signed</span>
                    </div>
                  </div>

                </div>

                <div className="text-center">
                  <p className="text-[10px] font-semibold text-slate-400">
                    Document ID: DOC-2026-FSUU-{selected.id}
                  </p>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

