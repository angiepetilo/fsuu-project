import React, { useState, useEffect, useMemo } from "react";
import { Shield, ShieldAlert, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { formatTime12 } from "@/lib/dateUtils";
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
  const [placeOfUse, setPlaceOfUse] = useState("");
  const [dateOfUsage, setDateOfUsage] = useState("");
  const [reservationEndDate, setReservationEndDate] = useState("");
  const [timeStart, setTimeStart] = useState("08:00");
  const [timeEnd, setTimeEnd] = useState("17:00");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isEquipment = Boolean(
    booking?.place_of_use !== undefined ||
    booking?.reservation_type === "equipment_borrowing" ||
    booking?.reservation_type === "equipment" ||
    (!booking?.venue_id && !booking?.venue?.id && booking?.equipment_name)
  );

  // Initialize form fields whenever modal opens or booking changes
  useEffect(() => {
    if (!isOpen || !booking) return;

    setErrorMessage("");
    setRemarks("");

    // Initial venue id or place of use
    const currentVenueId = booking.venue_id || booking.venue?.id || "";
    setTargetVenueId(currentVenueId ? String(currentVenueId) : "");
    setPlaceOfUse(booking.place_of_use || "");

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
    if (!isEquipment) {
      fetchVenues();
      fetchBookings();
    }
  }, [isOpen, booking, isEquipment]);

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
    if (isEquipment || !dateOfUsage || !timeStart || !timeEnd || allBookings.length === 0) return {};
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
  }, [dateOfUsage, reservationEndDate, timeStart, timeEnd, allBookings, booking?.id, isEquipment]);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage("");

    if (!isEquipment && !targetVenueId) {
      setErrorMessage("Please select a target venue.");
      return;
    }

    if (!dateOfUsage) {
      setErrorMessage("Start Date (Date of Usage) is required.");
      return;
    }

    const effectiveEndDate = isEquipment ? dateOfUsage : (reservationEndDate || dateOfUsage);
    if (!isEquipment && effectiveEndDate < dateOfUsage) {
      setErrorMessage("Reservation End Date cannot be earlier than Start Date.");
      return;
    }

    if (effectiveEndDate === dateOfUsage && timeEnd <= timeStart) {
      setErrorMessage("End Time must be later than Start Time for a same-day reservation.");
      return;
    }

    setIsSubmitting(true);
    try {
      let updatedBooking;

      if (isEquipment) {
        const payload = {
          date_of_usage: dateOfUsage,
          time_start: timeStart.length === 5 ? `${timeStart}:00` : timeStart,
          time_end: timeEnd.length === 5 ? `${timeEnd}:00` : timeEnd,
          place_of_use: placeOfUse || "Campus Facility",
          remarks: remarks.trim() || "Super Admin override: Equipment schedule adjusted",
        };

        const res = await api.put(`/avr-equipment-borrowings/${booking.id}/override`, payload);
        updatedBooking = res.data;

        notify.success("Override Applied", "Equipment borrowing schedule updated by Super Admin.");
        window.dispatchEvent(new CustomEvent("equipment_borrowings_updated"));
      } else {
        const payload = {
          venue_id: Number(targetVenueId),
          date_of_usage: dateOfUsage,
          reservation_end_date: effectiveEndDate,
          time_start: timeStart.length === 5 ? `${timeStart}:00` : timeStart,
          time_end: timeEnd.length === 5 ? `${timeEnd}:00` : timeEnd,
          remarks: remarks.trim() || "Super Admin override: Venue & Schedule adjusted",
        };

        const res = await api.put(`/avr-venue-bookings/${booking.id}/override`, payload);
        updatedBooking = res.data;

        notify.success("Override Applied", "Venue and schedule updated by Super Admin.");
        window.dispatchEvent(new CustomEvent("venue_bookings_updated"));
        window.dispatchEvent(new CustomEvent("venue_availability_updated"));
      }

      if (onBookingUpdated) {
        onBookingUpdated(updatedBooking);
      }

      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to apply override.";
      setErrorMessage(msg);
      notify.error("Override Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVenue = venues.find((v) => String(v.id) === String(targetVenueId));
  const conflict = selectedVenue ? venueConflicts[selectedVenue.id] : null;
  const referenceCode =
    booking.reference_code ||
    booking.tracking_number?.reference_code ||
    (isEquipment ? `EQ-2026-${booking.id}` : `TRK-AVR${booking.id}`);
  const filerName = booking.filer_name || booking.requestor_name || booking.borrower_name;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] text-slate-800 dark:text-slate-200">
        
        {/* Clean, Flat Modal Header (No dark or heavy gradient header) */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Super Admin Override
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {isEquipment ? "Schedule & Location" : "Venue & Schedule"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{referenceCode}</span>
                {filerName && ` • ${filerName}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium text-xs">{errorMessage}</span>
            </div>
          )}

          {/* Unobtrusive Authority Note */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <ShieldAlert size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Overrides bypass standard validation rules and are logged in the audit trail.</span>
          </div>

          {/* Venue Selection (Venue Bookings) or Place of Use (Equipment Borrowings) */}
          {!isEquipment ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Venue Reserved <span className="text-rose-500">*</span>
                </label>
                {selectedVenue && (
                  conflict ? (
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full">
                      ⚠️ Conflict Detected
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> Available
                    </span>
                  )
                )}
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
                  conflict ? "border-rose-300 dark:border-rose-700 bg-rose-50/20" : ""
                }
              />
              {selectedVenue && conflict && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2 mt-1.5">
                  <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Occupied on this slot:</strong> {conflict.filer_name || "Another booking"} (
                    {conflict.tracking_number?.reference_code || conflict.reference_code}
                    {conflict.time_start && ` • ${conflict.time_start.slice(0, 5)} - ${conflict.time_end?.slice(0, 5)}`}).
                    Overriding will assign this venue despite the overlap.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Place of Use / Location <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={placeOfUse}
                onChange={(e) => setPlaceOfUse(e.target.value)}
                placeholder="e.g. Science Lab 3, AVR Main..."
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          )}

          {/* Date Range Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
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
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {!isEquipment ? (
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  End Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={reservationEndDate}
                  min={dateOfUsage}
                  onChange={(e) => setReservationEndDate(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            ) : null}
          </div>

          {/* Time Range Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Start Time <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {formatTime12(timeStart)}
                </span>
              </div>
              <input
                type="time"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  End Time <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {formatTime12(timeEnd)}
                </span>
              </div>
              <input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Override Reason / Remarks */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Override Justification / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Schedule relocated per university convocation requirement..."
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Applying Override...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
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

export { SuperAdminVenueOverrideModal };
