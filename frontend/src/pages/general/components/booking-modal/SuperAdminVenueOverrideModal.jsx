import React, { useState, useEffect, useMemo } from "react";
import { Shield, ShieldAlert, ShieldCheck, X, Calendar, Clock, MapPin, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { formatTime12, formatDateRange } from "@/lib/dateUtils";
import CustomSelect from "@/components/ui/CustomSelect";

export default function SuperAdminVenueOverrideModal({
  isOpen,
  onClose,
  booking,
  onBookingUpdated,
  initialFocusField = "venue",
}) {
  const [venues, setVenues] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [targetVenueId, setTargetVenueId] = useState("");
  const [dateOfUsage, setDateOfUsage] = useState("");
  const [reservationEndDate, setReservationEndDate] = useState("");
  const [timeStart, setTimeStart] = useState("08:00");
  const [timeEnd, setTimeEnd] = useState("17:00");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Initialize form fields whenever modal opens or booking changes
  useEffect(() => {
    if (!isOpen || !booking) return;

    setErrorMessage("");
    setRemarks("");

    // Initial venue id
    const currentVenueId = booking.venue_id || booking.venue?.id || "";
    setTargetVenueId(currentVenueId ? String(currentVenueId) : "");

    // Initial dates
    const startDateRaw = booking.date_of_usage || booking.start_datetime || booking.date || "";
    const startDateFormatted = startDateRaw ? String(startDateRaw).slice(0, 10) : "";
    setDateOfUsage(startDateFormatted);

    const endDateRaw = booking.reservation_end_date || booking.end_datetime || booking.end_date || startDateRaw || "";
    const endDateFormatted = endDateRaw ? String(endDateRaw).slice(0, 10) : startDateFormatted;
    setReservationEndDate(endDateFormatted);

    // Initial times (slice to HH:mm)
    const startTimeRaw = booking.time_start || booking.start_datetime || "08:00";
    const cleanStart = String(startTimeRaw).includes("T")
      ? String(startTimeRaw).split("T")[1]?.slice(0, 5)
      : String(startTimeRaw).slice(0, 5);
    setTimeStart(cleanStart || "08:00");

    const endTimeRaw = booking.time_end || booking.end_datetime || "17:00";
    const cleanEnd = String(endTimeRaw).includes("T")
      ? String(endTimeRaw).split("T")[1]?.slice(0, 5)
      : String(endTimeRaw).slice(0, 5);
    setTimeEnd(cleanEnd || "17:00");

    // Fetch venues and active bookings for conflict checking
    fetchVenues();
    fetchBookings();
  }, [isOpen, booking]);

  const fetchBookings = async () => {
    try {
      const res = await api.get("/avr-venue-bookings?all=1&include_returned=0");
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setAllBookings(list);
    } catch {}
  };

  const fetchVenues = async () => {
    setLoadingVenues(true);
    try {
      const res = await api.get("/general/venues").catch(() => api.get("/public/venues"));
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (list.length > 0) {
        setVenues(list);
      } else {
        const cached = JSON.parse(localStorage.getItem("fsuu_venues") || "[]");
        if (Array.isArray(cached) && cached.length > 0) {
          setVenues(cached);
        }
      }
    } catch {
      const cached = JSON.parse(localStorage.getItem("fsuu_venues") || "[]");
      if (Array.isArray(cached) && cached.length > 0) {
        setVenues(cached);
      }
    } finally {
      setLoadingVenues(false);
    }
  };

  // Compute conflicting venue bookings for the chosen date/time window
  const venueConflicts = useMemo(() => {
    if (!dateOfUsage || !timeStart || !timeEnd || allBookings.length === 0) return {};
    const effectiveEnd = reservationEndDate || dateOfUsage;
    const conflicts = {};

    allBookings.forEach((b) => {
      if (String(b.id) === String(booking?.id)) return;
      const bStatus = (b.status || b.tracking_number?.status || "").toLowerCase();
      if (["cancelled", "rejected", "completed", "done"].includes(bStatus)) return;

      const bStart = (b.date_of_usage || b.start_datetime || "").slice(0, 10);
      const bEnd = (b.reservation_end_date || b.end_datetime || bStart).slice(0, 10);
      if (!bStart) return;

      const dateOverlap = dateOfUsage <= bEnd && effectiveEnd >= bStart;
      if (!dateOverlap) return;

      const bTimeStart = String(b.time_start || "08:00").slice(0, 5);
      const bTimeEnd = String(b.time_end || "17:00").slice(0, 5);
      const timeOverlap = timeStart < bTimeEnd && timeEnd > bTimeStart;

      if (timeOverlap && b.venue_id) {
        conflicts[b.venue_id] = b;
      }
    });

    return conflicts;
  }, [dateOfUsage, reservationEndDate, timeStart, timeEnd, allBookings, booking?.id]);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage("");

    if (!targetVenueId) {
      setErrorMessage("Please select a target venue.");
      return;
    }

    if (!dateOfUsage) {
      setErrorMessage("Start Date (Date of Usage) is required.");
      return;
    }

    const effectiveEndDate = reservationEndDate || dateOfUsage;
    if (effectiveEndDate < dateOfUsage) {
      setErrorMessage("Reservation End Date cannot be earlier than Start Date.");
      return;
    }

    if (effectiveEndDate === dateOfUsage && timeEnd <= timeStart) {
      setErrorMessage("End Time must be later than Start Time for a same-day booking.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        venue_id: Number(targetVenueId),
        date_of_usage: dateOfUsage,
        reservation_end_date: effectiveEndDate,
        time_start: timeStart.length === 5 ? `${timeStart}:00` : timeStart,
        time_end: timeEnd.length === 5 ? `${timeEnd}:00` : timeEnd,
        remarks: remarks.trim() || "Super Admin override: Venue & Schedule adjusted",
      };

      const res = await api.put(`/avr-venue-bookings/${booking.id}/override`, payload);
      const updatedBooking = res.data;

      notify.success(
        "Override Applied",
        "Venue and schedule have been successfully overridden by Super Admin."
      );

      if (onBookingUpdated) {
        onBookingUpdated(updatedBooking);
      }

      // Notify other views and dashboard calendars to refresh
      window.dispatchEvent(new CustomEvent("venue_bookings_updated"));
      window.dispatchEvent(new CustomEvent("venue_availability_updated"));

      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to override venue schedule.";
      setErrorMessage(msg);
      notify.error("Override Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVenue = venues.find((v) => String(v.id) === String(targetVenueId));
  const referenceCode =
    booking.reference_code ||
    booking.tracking_number?.reference_code ||
    `TRK-AVR${booking.id}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="relative max-w-xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 via-white to-amber-50/40 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border-b border-amber-200/80 dark:border-amber-800/60 flex items-start justify-between shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <Shield size={20} />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Super Admin Override
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  Venue & Schedule
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Track No.: <span className="font-bold text-slate-800 dark:text-slate-200">{referenceCode}</span>
                {booking.filer_name && ` • ${booking.filer_name}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-hover p-4 sm:p-5 space-y-3.5 text-xs">
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium text-xs">{errorMessage}</span>
            </div>
          )}

          {/* Notice Alert */}
          <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <ShieldAlert size={15} className="text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-800 dark:text-amber-400 font-medium leading-tight">
              <strong>Admin Authority:</strong> Reassigns venue & schedule. Action is logged in system audit trail.
            </p>
          </div>

          {/* Venue Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                <MapPin size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Venue Reserved *</span>
              </label>
              {selectedVenue && venueConflicts[selectedVenue.id] ? (
                <span className="text-[10.5px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60">
                  ⚠️ Conflict Detected
                </span>
              ) : selectedVenue ? (
                <span className="text-[10.5px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Available
                </span>
              ) : null}
            </div>
            <CustomSelect
              value={targetVenueId}
              onChange={(val) => setTargetVenueId(val)}
              disabled={loadingVenues || isSubmitting}
              options={venues.map((v) => {
                const conf = venueConflicts[v.id];
                const confRef = conf ? (conf.tracking_number?.reference_code || conf.reference_code || `TRK-${conf.id}`) : "";
                const prefix = conf ? `⚠️ [OCCUPIED: ${confRef}] ` : `✓ [AVAILABLE] `;
                const details = [
                  v.capacity ? `Cap: ${v.capacity_min ? `${v.capacity_min}-${v.capacity_max}` : v.capacity}` : "",
                  v.location,
                ].filter(Boolean).join(" • ");
                return {
                  value: String(v.id),
                  label: `${prefix}${v.name}`,
                  description: details || null,
                };
              })}
              placeholder="Select Target Venue..."
              buttonClassName={
                selectedVenue && venueConflicts[selectedVenue.id]
                  ? "border-rose-400 dark:border-rose-700 bg-rose-50/30"
                  : ""
              }
            />
            {selectedVenue && venueConflicts[selectedVenue.id] && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Scheduling Conflict:</strong> {selectedVenue.name} is booked on this timeslot by{" "}
                  <strong>{venueConflicts[selectedVenue.id].filer_name || "another requestor"}</strong> (
                  {venueConflicts[selectedVenue.id].tracking_number?.reference_code || venueConflicts[selectedVenue.id].reference_code}
                  {venueConflicts[selectedVenue.id].time_start && ` • ${venueConflicts[selectedVenue.id].time_start.slice(0, 5)} - ${venueConflicts[selectedVenue.id].time_end?.slice(0, 5)}`}).
                  As Super Admin, overriding will double-book this room unless times are altered.
                </div>
              </div>
            )}
            {selectedVenue && !venueConflicts[selectedVenue.id] && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Selected: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedVenue.name}</span>
                {selectedVenue.location ? ` (${selectedVenue.location})` : ""} &bull; <span className="text-emerald-600 dark:text-emerald-400 font-bold">Open & Available</span>
              </p>
            )}
          </div>

          {/* Date Range Fields */}
          <div className="space-y-1.5 pt-1">
            <label className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
              <Calendar size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Date Range *</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Start Date (Date of Usage)
                </span>
                <input
                  type="date"
                  value={dateOfUsage}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setDateOfUsage(newStart);
                    if (!reservationEndDate || reservationEndDate < newStart) {
                      setReservationEndDate(newStart);
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  End Date (Reservation End Date)
                </span>
                <input
                  type="date"
                  value={reservationEndDate}
                  min={dateOfUsage}
                  onChange={(e) => setReservationEndDate(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
              For single-day reservations, keep Start Date and End Date identical.
            </p>
          </div>

          {/* Time Range Fields */}
          <div className="space-y-1.5 pt-1">
            <label className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
              <Clock size={14} className="text-purple-600 dark:text-purple-400" />
              <span>Time Range *</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Start Time: <strong className="text-slate-800 dark:text-slate-200">{formatTime12(timeStart)}</strong>
                </span>
                <input
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  End Time: <strong className="text-slate-800 dark:text-slate-200">{formatTime12(timeEnd)}</strong>
                </span>
                <input
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Override Reason / Remarks */}
          <div className="space-y-1.5 pt-1">
            <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
              Override Justification / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Relocated to AVR Hall 2 per university convocation schedule requirement..."
              disabled={isSubmitting}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving Override...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Confirm Override</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
