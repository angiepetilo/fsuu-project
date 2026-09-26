import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Hash, CheckCircle2, Loader2, AlertCircle, Building2, PackageOpen, AlertTriangle, ArrowLeft, Clock, UploadCloud, FileText, Check, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import api from "@/lib/axios";
import echoInstance from "@/lib/echo";

export default function TrackBooking() {
  const [searchParams] = useSearchParams();
  const [hasSearched, setHasSearched] = useState(false);
  const [isFound, setIsFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [trackCode, setTrackCode] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Missing Requirements Resubmission States
  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitRemarks, setResubmitRemarks] = useState("");
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [resubmitSuccess, setResubmitSuccess] = useState("");
  const [resubmitError, setResubmitError] = useState("");
  const [catalog, setCatalog] = useState([]);

  useEffect(() => {
    api.get("/public/equipment-types")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setCatalog(list);
      })
      .catch(() => {});
  }, []);

  const getRemainingTime = useCallback((deadline) => {
    if (!deadline) return null;
    const end = new Date(deadline).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    if (diff <= 0) return "Grace period expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  }, []);

  const executeTrack = useCallback(async (codeToSearch) => {
    const query = (codeToSearch || trackCode).trim().toUpperCase();
    if (!query) return;
    setLoading(true);
    setHasSearched(false);
    setBooking(null);

    let foundRecord = null;

    // Try Backend API
    try {
      const { data } = await api.post('/public/track', {
        reference_code: query,
      });
      if (data && (data.reference_code || data.tracking_number || data.id)) {
        foundRecord = data;
      }
    } catch {}

    if (foundRecord) {
      setIsFound(true);
      setBooking(foundRecord);
    } else {
      setIsFound(false);
      setBooking(null);
    }

    setHasSearched(true);
    setLoading(false);
  }, [trackCode]);

  const handleResubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!resubmitFile) {
      setResubmitError("Please select a document or file to upload.");
      return;
    }
    setResubmitLoading(true);
    setResubmitError("");
    setResubmitSuccess("");

    try {
      const formData = new FormData();
      const ref = booking?.reference_code || trackCode;
      formData.append("reference_code", ref);
      formData.append("requirement_file", resubmitFile);
      formData.append("documents", resubmitFile);
      if (resubmitRemarks) {
        formData.append("applicant_remarks", resubmitRemarks);
      }

      const res = await api.post("/public/resubmit-requirements", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResubmitSuccess(res.data?.message || "Missing requirements uploaded successfully! Your reservation has been returned to review.");
      setResubmitFile(null);
      setResubmitRemarks("");
      setTimeout(() => {
        executeTrack(ref);
      }, 1500);
    } catch (err) {
      setResubmitError(err.response?.data?.message || "Failed to upload requirements. Please try again.");
    } finally {
      setResubmitLoading(false);
    }
  }, [resubmitFile, resubmitRemarks, booking?.reference_code, trackCode, executeTrack]);

  const handleTrack = useCallback((e) => {
    if (e) e.preventDefault();
    executeTrack(trackCode);
  }, [executeTrack, trackCode]);

  useEffect(() => {
    const urlRef = searchParams.get("ref") || searchParams.get("code");
    if (urlRef) {
      setTrackCode(urlRef);
      executeTrack(urlRef);
    }
  }, [searchParams, executeTrack]);

  // Real-time status update via Pusher WebSockets
  useEffect(() => {
    const ref = booking?.reference_code || trackCode;
    if (!ref) return;

    const channelName = `booking.${ref}`;
    const channel = echoInstance?.channel(channelName);
    if (channel?.listen) {
      channel.listen(".booking.status_updated", (data) => {
        if (data.status) {
          setBooking((prev) => (prev ? { ...prev, status: data.status, remarks: data.remarks || prev.remarks } : prev));
        }
      });
    }

    return () => {
      echoInstance?.leave(channelName);
    };
  }, [booking?.reference_code, trackCode]);

  const isEquipment = useMemo(() => {
    return booking?.tracking_number?.reservation_type === 'equipment_borrowing' ||
      booking?.tracking_number?.reservation_type === 'equipment_borrow' ||
      (Array.isArray(booking?.items) && booking?.items.length > 0) ||
      Boolean(booking?.equipment_name) ||
      (booking?.reference_code || trackCode).toUpperCase().startsWith('EQ');
  }, [booking, trackCode]);

  const isVenue = useMemo(() => {
    return !isEquipment && (
      booking?.type === 'venue' ||
      booking?.tracking_number?.reservation_type === 'venue_booking' ||
      Boolean(booking?.venue_id) ||
      Boolean(booking?.venue) ||
      (booking?.reference_code || trackCode).toUpperCase().startsWith('VN') ||
      (booking?.reference_code || trackCode).toUpperCase().startsWith('TRK-AVR')
    );
  }, [isEquipment, booking, trackCode]);

  // Timeline Step calculation:
  // Venue steps: Pending (1) -> Approved (2) -> On-going (3) -> Inspection (4) -> Completed (5)
  // Equipment steps: Pending (1) -> Claim/Approved (2) -> On-going/In Use (3) -> Inspection (4) -> Completed (5)
  const getVenueStepIndex = (status) => {
    const s = (status || "").toLowerCase().replace(/_/g, "-");
    if (s === "pending" || s === "incomplete") return 1;
    if (s === "approved") return 2;
    if (s === "ongoing" || s === "on-going") return 3;
    if (s === "inspection" || s === "post-inspection" || s === "post-event-inspection") return 4;
    if (s === "completed" || s === "complete" || s === "done" || s === "cleared" || s === "damaged" || s === "lost" || s === "late-return" || s === "returned-late") return 5;
    return 1;
  };

  const getEquipmentStepIndex = (status) => {
    const s = (status || "").toLowerCase().replace(/_/g, "-");
    if (s === "pending") return 1;
    if (s === "approved" || s === "claim" || s === "claimed" || s === "ready-to-claim") return 2;
    if (s === "ongoing" || s === "on-going" || s === "released" || s === "in-use" || s === "borrowed") return 3;
    if (s === "return" || s === "returned" || s === "inspection" || s === "post-inspection") return 4;
    if (s === "completed" || s === "complete" || s === "done" || s === "cleared" || s === "damaged" || s === "lost" || s === "late-return" || s === "returned-late") return 5;
    return 1;
  };

  const rawStatus = (booking?.status || booking?.tracking_number?.status || "pending").toLowerCase();

  // Check if lost or damaged items exist on this booking
  let hasLost = rawStatus === 'lost' || Boolean(booking?.is_lost) || String(booking?.condition || '').toLowerCase() === 'lost' || String(booking?.inspection_condition || '').toLowerCase() === 'lost';
  let hasDamaged = rawStatus === 'damaged' || Boolean(booking?.has_damage) || String(booking?.condition || '').toLowerCase() === 'damaged' || String(booking?.inspection_condition || '').toLowerCase() === 'damaged';

  if (booking?.unit_conditions) {
    let uConds = booking.unit_conditions;
    if (typeof uConds === 'string') { try { uConds = JSON.parse(uConds); } catch {} }
    if (typeof uConds === 'object' && uConds !== null) {
      Object.values(uConds).forEach((val) => {
        const c = String(typeof val === 'object' && val !== null ? (val.condition || val.status || '') : val).toLowerCase();
        if (c === 'lost') hasLost = true;
        if (c === 'damaged') hasDamaged = true;
      });
    }
  }

  const isCompletedStage = ['completed', 'complete', 'done', 'cleared', 'damaged', 'lost', 'late return', 'returned late'].includes(rawStatus) || Boolean(booking?.returned_at);
  const isInspectionStage = ['inspection', 'post-inspection', 'post_inspection'].includes(rawStatus);

  let activeStatus = rawStatus;
  if (isCompletedStage) {
    if (hasLost) {
      activeStatus = 'lost';
    } else if (hasDamaged) {
      activeStatus = 'damaged';
    } else {
      activeStatus = 'completed';
    }
  } else if (isInspectionStage) {
    activeStatus = 'inspection';
  }

  const isCompletedBooking = isCompletedStage;

  // Check if borrowed equipment unit or facility usage is past due for return
  const isPastDue = useMemo(() => {
    if (!booking) return false;
    const st = (booking.status || booking.tracking_number?.status || "").toLowerCase();
    if (['completed', 'complete', 'done', 'returned', 'cleared', 'cancelled', 'rejected', 'cancelled_by_user'].includes(st)) {
      return false;
    }
    const returnDate = booking.extend_of_date_returned || booking.extend_reservation_end_date || booking.reservation_end_date || booking.date_of_usage || booking.end_date || booking.start_datetime;
    if (!returnDate) return false;

    const returnTime = booking.time_end || (booking.end_datetime ? booking.end_datetime.slice(11, 19) : null) || "17:00:00";
    const dStr = typeof returnDate === 'string' ? returnDate.split('T')[0] : new Date(returnDate).toISOString().split('T')[0];
    
    let tStr = "17:00:00";
    if (returnTime.includes("AM") || returnTime.includes("PM")) {
      try {
        const d = new Date(`1970-01-01 ${returnTime.trim()}`);
        if (!isNaN(d.getTime())) tStr = d.toTimeString().slice(0, 8);
      } catch {}
    } else {
      const parts = returnTime.trim().split(":");
      tStr = `${parts[0]?.padStart(2, '0') || '00'}:${parts[1]?.padStart(2, '0') || '00'}:00`;
    }

    const dueMs = new Date(`${dStr}T${tStr}`).getTime();
    if (isNaN(dueMs)) return false;
    return Date.now() > dueMs;
  }, [booking]);

  const currentStep = booking
    ? (isVenue ? getVenueStepIndex(rawStatus) : getEquipmentStepIndex(rawStatus))
    : 1;

  const venueSteps = [
    { label: "Pending", desc: "Awaiting admin approval" },
    { label: "Approved", desc: "Venue slot reserved" },
    { label: "On-going", desc: "Event in progress" },
    { label: "Inspection", desc: "Post-event check" },
    { label: "Completed", desc: "Clearance done" },
  ];

  const equipmentSteps = [
    { label: "Pending", desc: "Awaiting staff review" },
    { label: "Claim", desc: "Ready to claim (Bring ID)" },
    { label: "On-going", desc: "Released & in use (Kiosk return due)" },
    { label: "Inspection", desc: "Returned & condition check" },
    { label: "Completed", desc: "Cleared & log closed" },
  ];

  const activeSteps = isVenue ? venueSteps : equipmentSteps;

  const formatTime12 = (tStr) => {
    if (!tStr) return "";
    let raw = tStr;
    if (raw.includes("T")) raw = raw.split("T")[1];
    const parts = raw.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || "0", 10);
    if (isNaN(h)) return "";
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const usageTimeRange = booking?.time_start && booking?.time_end
    ? `${formatTime12(booking.time_start)} - ${formatTime12(booking.time_end)}`
    : (booking?.start_datetime && booking?.end_datetime
      ? `${formatTime12(booking.start_datetime)} - ${formatTime12(booking.end_datetime)}`
      : "—");

  const getRequestedEquipmentList = () => {
    if (!booking) return [];
    if (Array.isArray(booking.items) && booking.items.length > 0) {
      return booking.items.map(it => {
        const eqType = it.equipment_type || it.equipmentType;
        const matchedCatalog = (catalog || []).find(c =>
          String(c.id) === String(it.equipment_type_id || eqType?.id) ||
          (c.name || c.eq_name || '').toLowerCase() === (it.equipment_name || it.category || eqType?.eq_name || eqType?.name || '').toLowerCase()
        );

        const rawBuilt = eqType?.built_in_names ||
          it.built_in_names ||
          matchedCatalog?.built_in_names ||
          eqType?.built_in_units ||
          it.built_in_units ||
          matchedCatalog?.built_in_units ||
          [];

        const builtList = Array.isArray(rawBuilt) ? rawBuilt : (typeof rawBuilt === 'string' ? JSON.parse(rawBuilt || '[]') : []);

        const builtInNames = builtList.map(bi => {
          if (typeof bi === 'string' && isNaN(Number(bi))) {
            return bi.trim();
          }
          const cat = (catalog || []).find(c => String(c.id) === String(bi) || (c.name || c.eq_name || '').toLowerCase() === String(bi).toLowerCase());
          return cat ? (cat.name || cat.eq_name) : (isNaN(Number(bi)) ? String(bi) : null);
        }).filter(Boolean);

        return {
          name: eqType?.eq_name || eqType?.name || matchedCatalog?.name || matchedCatalog?.eq_name || it.equipment_name || it.category || "Equipment Item",
          qty: parseInt(it.quantity_requested || it.quantity || 1, 10),
          builtInNames: Array.from(new Set(builtInNames)),
        };
      });
    }
    if (booking.equipment_name || booking.equipment) {
      const name = booking.equipment_name || booking.equipment;
      const matchedCatalog = (catalog || []).find(c =>
        String(c.id) === String(booking.equipment_type_id) ||
        (c.name || c.eq_name || '').toLowerCase() === String(name).toLowerCase()
      );
      const rawBuilt = matchedCatalog?.built_in_names || matchedCatalog?.built_in_units || [];
      const builtList = Array.isArray(rawBuilt) ? rawBuilt : (typeof rawBuilt === 'string' ? JSON.parse(rawBuilt || '[]') : []);
      const builtInNames = builtList.map(bi => {
        if (typeof bi === 'string' && isNaN(Number(bi))) return bi.trim();
        const cat = (catalog || []).find(c => String(c.id) === String(bi));
        return cat ? (cat.name || cat.eq_name) : (isNaN(Number(bi)) ? String(bi) : null);
      }).filter(Boolean);

      return [{
        name: name,
        qty: parseInt(booking.quantity || booking.qty || 1, 10),
        builtInNames: Array.from(new Set(builtInNames)),
      }];
    }
    return [];
  };

  const equipmentItems = getRequestedEquipmentList();

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto relative animate-in fade-in duration-500">

      {/* Back to Homepage navigation */}
      <div className="w-full flex items-center justify-start mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-card hover:bg-muted border border-border px-3.5 py-2 rounded-lg transition-all shadow-2xs min-h-[36px] group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Homepage</span>
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 w-full shadow-xs transition-colors">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center mb-1">
          Track Booking Status
        </h2>

        <p className="text-muted-foreground text-xs sm:text-sm text-center mb-6 font-normal">
          Enter your unique Reference Code to view real-time approval, claiming, and turnover progress.
        </p>

        <form onSubmit={handleTrack} className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Reference Code <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                value={trackCode}
                onChange={e => setTrackCode(e.target.value)}
                placeholder="e.g. TRK-AVR8921 or EQUIP-REQ-101"
                required
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-card border border-border hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-foreground text-sm font-medium transition-all outline-none"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 min-h-[44px] rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {loading ? "Searching Timeline..." : "Track Status"}
          </Button>
        </form>

        {hasSearched && !isFound && (
          <div className="p-4 bg-rose-50 border border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-400 rounded-xl text-center text-xs font-semibold text-rose-700 flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            No reservation found matching reference code "{trackCode}". Please verify your reference code.
          </div>
        )}

        {hasSearched && isFound && booking && (
          <div className="mt-8 pt-8 border-t border-border space-y-6">

            {/* Header info */}
            <div className="flex justify-between items-center bg-muted/40 p-4 rounded-xl border border-border/70">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${isVenue ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                  {isVenue ? <Building2 size={22} /> : <PackageOpen size={22} />}
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    {isVenue ? "Venue Reservation Timeline" : "Equipment Borrowing Timeline"}
                  </span>
                  <span className="text-base font-bold text-foreground">{booking.reference_code || trackCode}</span>
                </div>
              </div>

              <StatusBadge status={activeStatus} className="px-3 py-1 text-xs" />
            </div>

            {/* OVERDUE EQUIPMENT RETURN BANNER */}
            {isPastDue && (
              <div className="p-4 bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-transparent border-2 border-rose-500/40 rounded-2xl text-rose-950 dark:text-rose-200 shadow-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="p-2.5 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                  <AlertTriangle size={22} className="animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                      {isVenue ? "Facility Usage & Equipment Return Overdue" : "Equipment Unit(s) Past Due for Return"}
                    </h4>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                      Scheduled End: {usageTimeRange}
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-200 mt-1 font-medium leading-relaxed">
                    The scheduled return time for the equipment unit(s) borrowed under Reference Code <strong>{booking.reference_code || trackCode}</strong> has elapsed. Please return all physical units immediately to the PMO / AVR office or equipment kiosk to finalize condition clearance and prevent late policy penalties.
                  </p>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-muted/30 p-4 rounded-xl border border-border/60">
                <span className="text-muted-foreground font-semibold uppercase text-[11px] block">Requestor Filer</span>
                <span className="text-sm font-semibold text-foreground">{booking.filer_name || booking.requestor_name || "—"}</span>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/60">
                <span className="text-muted-foreground font-semibold uppercase text-[11px] block">
                  {isVenue ? "Reserved Venue / Facility" : "Equipment Category & Qty"}
                </span>
                {isVenue ? (
                  <span className="text-sm font-semibold text-primary">
                    {booking.venue?.name || booking.venue_name || "AVR / Campus Venue"}
                  </span>
                ) : equipmentItems.length > 0 ? (
                  <div className="space-y-2 mt-1.5">
                    {equipmentItems.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                            <span>{item.name}</span>
                            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                              Qty: {item.qty}
                            </span>
                          </span>
                        </div>
                        {item.builtInNames && item.builtInNames.length > 0 && (
                          <div className="flex items-center flex-wrap gap-1 text-[11px] text-muted-foreground pt-0.5">
                            <span className="font-bold text-foreground">Built-in:</span>
                            {item.builtInNames.map((bName, bIdx) => (
                              <span key={bIdx} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-[10px] font-bold">
                                {bName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-primary">
                    {booking.equipment_name || "General Equipment"}
                  </span>
                )}
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/60">
                <span className="text-muted-foreground font-semibold uppercase text-[11px] block">Department / Program</span>
                <span className="text-sm font-medium text-foreground">{booking.program_office || booking.department?.name || booking.department || "Academic Dept"}</span>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/60">
                <span className="text-muted-foreground font-semibold uppercase text-[11px] block">Date of Usage</span>
                <span className="text-sm font-medium text-foreground">
                  {booking.date_of_usage ? new Date(booking.date_of_usage).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : (booking.start_datetime ? new Date(booking.start_datetime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—")}
                </span>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/60">
                <span className="text-muted-foreground font-semibold uppercase text-[11px] block">Schedule Time</span>
                <span className="text-sm font-medium text-foreground">{usageTimeRange}</span>
              </div>
              {booking.assigned_units && Object.keys(typeof booking.assigned_units === 'string' ? JSON.parse(booking.assigned_units || '{}') : booking.assigned_units).length > 0 ? (
                <div className="bg-muted/30 p-4 rounded-xl border border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold uppercase text-[11px] block">Assigned Physical Unit(s)</span>
                    {isPastDue && (
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle size={10} /> Overdue
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.values(typeof booking.assigned_units === 'string' ? JSON.parse(booking.assigned_units || '{}') : booking.assigned_units).map((code, uIdx) => (
                      <span key={uIdx} className={`px-2 py-0.5 rounded-md text-xs font-semibold ${isPastDue ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30' : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'}`}>
                        Unit {code}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 p-4 rounded-xl border border-border/60">
                  <span className="text-muted-foreground font-semibold uppercase text-[11px] block">Physical Unit Status</span>
                  <span className={`text-xs font-semibold ${isPastDue ? 'text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1' : 'text-muted-foreground'}`}>
                    {isPastDue ? (
                      <>
                        <AlertTriangle size={13} className="animate-pulse" />
                        <span>Past Due for Return (Overdue)</span>
                      </>
                    ) : ['ongoing', 'on-going', 'released', 'in-use', 'borrowed'].includes((activeStatus || '').toLowerCase())
                      ? 'Released to Borrower'
                      : ['completed', 'done', 'cleared'].includes((activeStatus || '').toLowerCase())
                        ? 'Returned to Kiosk'
                        : 'Assigned on Release'}
                  </span>
                </div>
              )}
              <div className="bg-muted/30 p-4 rounded-xl border border-border/60 sm:col-span-2">
                <span className="text-muted-foreground font-semibold uppercase text-[11px] block">Purpose / Activity</span>
                <span className="text-sm font-medium text-foreground">{booking.purpose || "Official University Activity"}</span>
              </div>
            </div>

            {/* INCOMPLETE STATUS & MISSING REQUIREMENTS RESUBMISSION CARD */}
            {(activeStatus || '').toLowerCase() === 'incomplete' && (
              <div className="p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card border-2 border-amber-500/40 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <AlertTriangle size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                        Action Required: Incomplete Requirements
                      </h3>
                      {booking.incomplete_deadline_at && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                          <Hourglass size={13} className="animate-pulse" />
                          <span>Deadline: {getRemainingTime(booking.incomplete_deadline_at)}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
                      Your booking review requires supplementary documentation. Please upload the requested missing requirement(s) before the grace period expires. If the deadline passes, another requestor with complete requirements for this schedule may be given priority.
                    </p>
                  </div>
                </div>

                {/* Reviewer Remarks & Missing Items Breakdown */}
                <div className="p-3.5 bg-background/80 dark:bg-muted/40 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-foreground">Reviewer Remarks / Needed Items:</span>
                  </div>
                  <p className="text-xs text-foreground font-medium pl-5 whitespace-pre-wrap">
                    {booking.missing_requirements_remarks || booking.remarks || "Missing endorsement letter or department clearance."}
                  </p>
                  {booking.missing_requirements_list && (
                    <div className="pl-5 pt-1 flex flex-wrap gap-1.5">
                      {(Array.isArray(booking.missing_requirements_list) 
                        ? booking.missing_requirements_list 
                        : typeof booking.missing_requirements_list === 'string' && booking.missing_requirements_list.startsWith('[')
                          ? JSON.parse(booking.missing_requirements_list)
                          : [booking.missing_requirements_list]
                      ).map((item, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                          • {item}
                        </span>
                      ))}
                    </div>
                  )}
                  {booking.incomplete_deadline_at && (
                    <p className="text-[11px] text-muted-foreground pl-5 pt-1">
                      Grace period ends on: <strong className="text-foreground">{new Date(booking.incomplete_deadline_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</strong>
                    </p>
                  )}
                </div>

                {/* Interactive Resubmission Upload Form */}
                <form onSubmit={handleResubmit} className="p-4 bg-background border border-border rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UploadCloud size={16} className="text-primary" />
                    <span>Upload & Resubmit Missing Document</span>
                  </h4>

                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      id="missing-req-upload"
                      accept=".pdf,.png,.jpg,.jpeg,.docx,.doc"
                      required
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setResubmitFile(e.target.files[0]);
                          setResubmitError("");
                        }
                      }}
                      className="block w-full text-xs text-foreground file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer bg-muted/30 border border-border rounded-lg p-1.5 transition-all"
                    />
                    <p className="text-[10.5px] text-muted-foreground">
                      Accepted formats: PDF, DOCX, PNG, JPG (Max 10MB)
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Additional Notes / Explanation (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={resubmitRemarks}
                      onChange={(e) => setResubmitRemarks(e.target.value)}
                      placeholder="e.g. Attached signed endorsement letter from Dean's office."
                      className="w-full p-2.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {resubmitError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{resubmitError}</span>
                    </div>
                  )}

                  {resubmitSuccess && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <Check size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{resubmitSuccess}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      disabled={resubmitLoading || !resubmitFile}
                      className="px-5 py-2.5 text-xs font-bold bg-primary hover:opacity-90 text-primary-foreground rounded-lg shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {resubmitLoading ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Uploading & Submitting...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={14} />
                          <span>Submit Missing Requirements</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* 5-Step Timeline Tracker */}
            <div className="pt-6 space-y-6">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Progress Timeline ({isVenue ? "Venue Process" : "Equipment Kiosk Process"})
              </h4>

              {/* Desktop Horizontal Timeline (>= sm) */}
              <div className="hidden sm:flex relative justify-between items-start">
                {/* Connecting Line Track */}
                <div className="absolute top-4 left-[18px] right-[18px] -translate-y-1/2 h-1 z-0 bg-border rounded-full">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${isCompletedBooking ? 100 : Math.min(100, Math.max(0, (currentStep - 1) * 25))}%` }}
                  />
                </div>

                {activeSteps.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isStepDone = stepNum < currentStep || (stepNum <= currentStep && isCompletedBooking);
                  const isActive = stepNum === currentStep && !isCompletedBooking;

                  return (
                    <div key={idx} className="relative z-20 flex flex-col items-center text-center max-w-[100px]">
                      <div
                        className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all
                          ${isStepDone ? 'bg-primary border-primary text-primary-foreground shadow-2xs' : ''}
                          ${isActive ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 scale-105 shadow-2xs' : ''}
                          ${!isStepDone && !isActive ? 'bg-card border-border text-muted-foreground' : ''}
                        `}
                      >
                        {isStepDone ? <CheckCircle2 size={16} /> : stepNum}
                      </div>

                      <span className={`text-xs font-semibold mt-2.5 block ${isStepDone || isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                      <span className="text-[10.5px] font-normal text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                        {step.desc}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Vertical Timeline (< sm) */}
              <div className="sm:hidden space-y-4 relative pl-4 border-l-2 border-border ml-3">
                {activeSteps.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isStepDone = stepNum < currentStep || (stepNum <= currentStep && isCompletedBooking);
                  const isActive = stepNum === currentStep && !isCompletedBooking;

                  return (
                    <div key={idx} className="relative flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full border-2 -ml-[23px] flex items-center justify-center text-xs font-bold transition-all shrink-0
                          ${isStepDone ? 'bg-primary border-primary text-primary-foreground' : ''}
                          ${isActive ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                          ${!isStepDone && !isActive ? 'bg-card border-border text-muted-foreground' : ''}
                        `}
                      >
                        {isStepDone ? <CheckCircle2 size={13} /> : stepNum}
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isStepDone || isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        {step.desc && (
                          <p className="text-[11px] text-muted-foreground font-normal">{step.desc}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Requirement & Dynamic Status Callout Tags */}
              {!isVenue && (
                <>
                  {currentStep === 1 && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-bold flex items-center gap-2">
                      <Clock size={18} className="text-amber-600 shrink-0" />
                      <span><strong>Pending Staff Review:</strong> Your equipment borrowing requisition is received and awaiting staff verification.</span>
                    </div>
                  )}
                  {currentStep === 2 && (
                    <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs font-bold flex items-center gap-2">
                      <PackageOpen size={18} className="text-blue-600 shrink-0" />
                      <span><strong>Ready for Claim:</strong> Your borrowing is approved! Please bring your <strong>Institutional Student/Employee ID</strong> to the equipment kiosk to collect items.</span>
                    </div>
                  )}
                  {currentStep === 3 && (
                    <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs font-bold flex items-center gap-2">
                      <PackageOpen size={18} className="text-blue-600 shrink-0" />
                      <span><strong>Equipment In Use (On-going):</strong> Physical equipment has been released to the borrower. Return is due at the kiosk before the scheduled return time ({usageTimeRange}).</span>
                    </div>
                  )}
                  {currentStep === 4 && (
                    <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-purple-600 shrink-0" />
                      <span><strong>Returned & Inspection:</strong> Equipment has been returned to the kiosk and is undergoing post-turnover condition check.</span>
                    </div>
                  )}
                  {currentStep === 5 && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <span><strong>Requisition Completed:</strong> Physical units inspected and returned in good condition. Clearance finalized and record closed.</span>
                    </div>
                  )}
                </>
              )}

              {/* Rejection / Cancellation Callouts */}
              {(activeStatus || '').toLowerCase() === 'rejected' && (
                <div className="p-4 bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-transparent border-2 border-rose-500/40 rounded-2xl text-rose-950 dark:text-rose-200 shadow-sm space-y-2.5 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                      <AlertCircle size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                          Requisition Rejected
                        </h4>
                        {(booking.rejection_reason || booking.remarks) && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            {String(booking.rejection_reason || booking.remarks).toLowerCase().includes('conflict') 
                              ? 'Schedule Conflict' 
                              : String(booking.rejection_reason || booking.remarks).toLowerCase().includes('requirement') 
                                ? 'Incomplete Requirements' 
                                : 'Administrative Review'}
                          </span>
                        )}
                      </div>
                      
                      {/* Detailed Rejection Reason */}
                      <div className="mt-2 p-3 bg-card/90 border border-rose-500/30 rounded-xl shadow-2xs space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-rose-600 dark:text-rose-400 block">
                          Reason for Rejection:
                        </span>
                        <p className="text-xs font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                          {booking.rejection_reason || booking.remarks || "This request was not approved due to a schedule conflict. Another reservation was confirmed for this timeslot. Please contact the PMO/AVR office."}
                        </p>
                      </div>

                      {/* Conflict & Re-booking Policy Guidance */}
                      <p className="text-[11.5px] text-rose-900/80 dark:text-rose-300/80 mt-2 font-medium leading-relaxed">
                        Under university facility booking policies, reservations for the same venue and timeslot are processed on a First-Come, First-Served basis among applicants who have completed all required endorsements. You may submit a new reservation for an available vacant venue or alternative schedule.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(activeStatus || '').toLowerCase() === 'cancelled' && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                  <span><strong>Reservation Cancelled:</strong> This reservation has been cancelled.</span>
                </div>
              )}

              {booking.has_violation || booking.status === 'damaged' || booking.status === 'lost' ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                  <span><strong>Inspection Flag:</strong> This reservation has recorded violations or equipment damage/loss fines. Please report to facility admin.</span>
                </div>
              ) : null}

              {/* Cancellation Option for Pending / Approved / Incomplete Requests */}
              {['pending', 'approved', 'incomplete'].includes((booking.status || '').toLowerCase()) && (
                <div className="pt-4 mt-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/40 p-4 rounded-xl border border-border/70">
                  <div>
                    <h5 className="text-xs font-semibold text-foreground">Need to cancel this {isVenue ? 'booking' : 'borrowing'}?</h5>
                    <p className="text-[11px] text-muted-foreground font-normal">You can cancel your reservation before the scheduled start time.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2 bg-card hover:bg-rose-50 hover:text-rose-700 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs min-h-[38px]"
                  >
                    Cancel {isVenue ? 'Venue Booking' : 'Equipment Borrowing'}
                  </button>
                </div>
              )}

            </div>

          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4">
            <div className="bg-card text-foreground rounded-2xl p-6 max-w-sm w-full shadow-xl border border-border space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Cancel Reservation</h4>
                  <p className="text-[11px] text-muted-foreground font-normal">This action cannot be undone.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Reason for Cancellation (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Activity rescheduled, no longer needed..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-3 bg-card border border-border rounded-lg text-xs font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 min-h-[40px] rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Keep Reservation
                </button>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={async () => {
                    setCancelLoading(true);
                    try {
                      const ref = booking?.reference_code || trackCode;
                      await api.post('/public/cancel-booking', {
                        reference_code: ref,
                        reason: cancelReason || 'Cancelled by applicant',
                      });
                      setShowCancelModal(false);
                      executeTrack(ref);
                    } catch (err) {
                      alert(err?.response?.data?.message || 'Failed to cancel reservation.');
                    } finally {
                      setCancelLoading(false);
                    }
                  }}
                  className="px-4 py-2 min-h-[40px] rounded-lg bg-destructive hover:opacity-90 text-destructive-foreground font-semibold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {cancelLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                  <span>Confirm Cancellation</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
