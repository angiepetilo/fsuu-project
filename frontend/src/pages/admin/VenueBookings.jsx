import { useState, useEffect, useCallback } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import api from "@/lib/axios";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, AlertCircle, Eye, Building2, ChevronLeft, ChevronRight
} from "lucide-react";
import VenueBookingDetailModal from "./components/VenueBookingDetailModal";
import { PageLoader } from "@/components/ui/page-loader";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatTime, formatTimeRange } from "@/lib/dateUtils";

export default function VenueBookings() {
  const context = useOutletContext();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); 

  // Detail Modal & Notification Modal State (Decoupled from list array reference)
  const [selectedId, setSelectedId] = useState(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionComments, setRejectionComments] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const selected = bookings.find((b) => String(b.id) === String(selectedId)) || null;

  const setSelected = (val) => {
    if (!val) {
      setSelectedId(null);
    } else if (val.id) {
      setSelectedId(val.id);
    } else {
      setSelectedId(null);
    }
  };

  const [inspectionStatus, setInspectionStatus] = useState("clean");
  const [evidencePhoto, setEvidencePhoto] = useState(null);
  const [violationNotes, setViolationNotes] = useState("");
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyReason, setNotifyReason] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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

  // Deep-link from notification navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = params.get("id") || location.state?.selectedId;
    const targetRef = params.get("trk") || params.get("ref");
    if ((targetId || targetRef) && bookings.length > 0) {
      const match = bookings.find(b => 
        (targetId && String(b.id) === String(targetId)) ||
        (targetRef && (b.reference_code === targetRef || b.tracking_number?.reference_code === targetRef))
      );
      if (match) {
        setSelectedId(match.id);
      }
    }
  }, [location.search, location.state, bookings]);

  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";
  const selectedOfficeId = context?.selectedOfficeId;

  const filteredBookings = bookings.filter(b => {
    const s = (b.status || b.tracking_number?.status || "").toLowerCase();
    const notDone = s !== "completed" && s !== "damaged" && s !== "solved" && s !== "rejected" && s !== "cancelled";
    if (!notDone) return false;

    if (selectedOfficeId && selectedOfficeId !== "all") {
      const offId = b.venue?.office_id || b.office_id || b.office?.id;
      const offName = b.venue?.office?.name || b.office?.name || b.office_name;
      if (offId) return String(offId) === String(selectedOfficeId);
      if (offName && officeScope && officeScope !== "All Offices") {
        return offName.toLowerCase().includes(officeScope.toLowerCase());
      }
    }
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredBookings.length]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleAction = async (bookingId, action, customData = {}) => {
    setActionLoading(`${bookingId}-${action}`);
    try {
      let endpoint = `/avr-venue-bookings/${bookingId}/${action}`;
      const payload = { ...customData };
      if (action === "reject" && rejectionComments) {
        payload.rejection_reason = rejectionComments;
      }
      const res = await api.post(endpoint, payload);

      const updatedRecord = res.data && typeof res.data === "object" ? res.data : {};
      const statusMap = {
        approve: "approved",
        ongoing: "on-going",
        complete: "completed",
        reject: "rejected",
        cancel: "cancelled"
      };
      const newStatus = statusMap[action] || action;
      const refCode = selected?.reference_code || selected?.tracking_number?.reference_code || `TRK-AVR${bookingId}`;

      if (action === "complete") {
        toast.success(`Venue booking (${refCode}) completed and transferred to History Log!`);
        setFeedbackMessage(`✅ Venue booking (${refCode}) transferred to History Log.`);
        setSelectedId(null);
        setShowRejectForm(false);
      } else if (action === "reject") {
        toast.error(`Venue booking (${refCode}) rejected and transferred to History Log.`);
        setFeedbackMessage(`Venue booking (${refCode}) rejected and transferred to History Log.`);
        setSelectedId(null);
        setShowRejectForm(false);
      } else {
        toast.success(`Venue booking updated: ${newStatus}`);
        setFeedbackMessage(`✅ Reservation request ${action}ed successfully!`);
      }

      // Patch the specific venue booking record in-place
      setBookings((prev) =>
        prev.map((b) => {
          if (String(b.id) === String(bookingId)) {
            const updatedTracking = b.tracking_number
              ? { ...b.tracking_number, status: newStatus }
              : { status: newStatus };
            return {
              ...b,
              ...updatedRecord,
              status: newStatus,
              tracking_number: updatedTracking,
              trackingNumber: updatedTracking,
            };
          }
          return b;
        })
      );
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Action failed.");
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Manage Bookings
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manage venue reservation requests for {officeScope}.
          </p>
        </div>
        <button
          onClick={fetchBookings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-700 hover:text-white hover:border-blue-700 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
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
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                      <span className="text-xs font-semibold italic">Loading venue bookings...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-semibold">
                    No venue bookings found under status filter "{statusFilter}".
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b, idx) => {
                  const refCode = b.tracking_number?.reference_code || b.reference_code || `TRK-AVR${b.id}`;
                  const requestor = b.filer_name || b.requestor_name || "—";
                  const department = b.program_office || b.department || "—";
                  const venueName = b.venue?.name || b.venue_name || "AVR Auditorium";
                  const usageDate = b.reservation_end_date && String(b.reservation_end_date).substring(0, 10) !== String(b.date_of_usage || b.start_datetime).substring(0, 10)
                    ? `${formatDate(b.date_of_usage || b.start_datetime)} - ${formatDate(b.reservation_end_date)}`
                    : formatDate(b.date_of_usage || b.start_datetime);
                  const timeRange = formatTimeRange(b.time_start, b.time_end);
                  const currentStatus = b.status || b.tracking_number?.status || "pending";
                  const displayIndex = startIndex + idx + 1;

                  return (
                    <tr key={`vb-row-${b.id}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-400">{displayIndex}</td>
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

        {/* Pagination Footer */}
        {filteredBookings.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to{" "}
              <span className="font-extrabold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filteredBookings.length)}</span> of{" "}
              <span className="font-extrabold text-slate-900">{filteredBookings.length}</span> venue bookings
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
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
