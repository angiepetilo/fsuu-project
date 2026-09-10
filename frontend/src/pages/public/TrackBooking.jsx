import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Hash, CheckCircle2, Loader2, AlertCircle, Building2, PackageOpen, AlertTriangle, ArrowLeft, Clock } from "lucide-react";
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

  const executeTrack = async (codeToSearch) => {
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
  };

  const handleTrack = (e) => {
    if (e) e.preventDefault();
    executeTrack(trackCode);
  };

  useEffect(() => {
    const urlRef = searchParams.get("ref") || searchParams.get("code");
    if (urlRef) {
      setTrackCode(urlRef);
      executeTrack(urlRef);
    }
  }, [searchParams]);

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


  const isEquipment = booking?.tracking_number?.reservation_type === 'equipment_borrowing' ||
    booking?.tracking_number?.reservation_type === 'equipment_borrow' ||
    (Array.isArray(booking?.items) && booking?.items.length > 0) ||
    Boolean(booking?.equipment_name) ||
    (booking?.reference_code || trackCode).toUpperCase().startsWith('EQ');

  const isVenue = !isEquipment && (
    booking?.type === 'venue' ||
    booking?.tracking_number?.reservation_type === 'venue_booking' ||
    Boolean(booking?.venue_id) ||
    Boolean(booking?.venue) ||
    (booking?.reference_code || trackCode).toUpperCase().startsWith('VN') ||
    (booking?.reference_code || trackCode).toUpperCase().startsWith('TRK-AVR')
  );

  // Timeline Step calculation:
  // Venue steps: Pending (1) -> Approved (2) -> On-going (3) -> Inspection (4) -> Completed (5)
  // Equipment steps: Pending (1) -> Claim/Approved (2) -> On-going/In Use (3) -> Inspection (4) -> Completed (5)
  const getVenueStepIndex = (status) => {
    const s = (status || "").toLowerCase().replace(/_/g, "-");
    if (s === "pending") return 1;
    if (s === "approved") return 2;
    if (s === "ongoing" || s === "on-going") return 3;
    if (s === "inspection" || s === "post-inspection" || s === "post-event-inspection") return 4;
    if (s === "completed") return 5;
    return 1;
  };

  const getEquipmentStepIndex = (status) => {
    const s = (status || "").toLowerCase().replace(/_/g, "-");
    if (s === "pending") return 1;
    if (s === "approved" || s === "claim" || s === "claimed" || s === "ready-to-claim") return 2;
    if (s === "ongoing" || s === "on-going" || s === "released" || s === "in-use" || s === "borrowed") return 3;
    if (s === "return" || s === "returned" || s === "inspection" || s === "post-inspection") return 4;
    if (s === "completed" || s === "done" || s === "cleared") return 5;
    return 1;
  };

  const activeStatus = booking?.status || booking?.tracking_number?.status || "pending";
  const isCompletedBooking = ['completed', 'done', 'cleared'].includes((activeStatus || '').toLowerCase());

  const currentStep = booking
    ? (isVenue ? getVenueStepIndex(activeStatus) : getEquipmentStepIndex(activeStatus))
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
      return booking.items.map(it => ({
        name: it.equipment_type?.eq_name || it.equipment_type?.name || it.equipment_name || it.category || "Equipment Item",
        qty: parseInt(it.quantity_requested || it.quantity || 1, 10),
      }));
    }
    if (booking.equipment_name || booking.equipment) {
      return [{
        name: booking.equipment_name || booking.equipment,
        qty: parseInt(booking.quantity || booking.qty || 1, 10),
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
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {equipmentItems.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                        <span>{item.name}</span>
                        <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                          Qty: {item.qty}
                        </span>
                      </span>
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
                  <span className="text-muted-foreground font-semibold uppercase text-[11px] block">Assigned Physical Unit(s)</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.values(typeof booking.assigned_units === 'string' ? JSON.parse(booking.assigned_units || '{}') : booking.assigned_units).map((code, uIdx) => (
                      <span key={uIdx} className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30 text-xs font-semibold">
                        Unit {code}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 p-4 rounded-xl border border-border/60">
                  <span className="text-muted-foreground font-semibold uppercase text-[11px] block">Physical Unit Status</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {['ongoing', 'on-going', 'released', 'in-use', 'borrowed'].includes((activeStatus || '').toLowerCase())
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
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                  <span><strong>Requisition Rejected:</strong> This request was not approved. {booking.rejection_reason || booking.remarks ? `Remarks: ${booking.rejection_reason || booking.remarks}` : "Please contact the PMO/AVR office."}</span>
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

              {/* Cancellation Option for Pending / Approved Requests */}
              {['pending', 'approved'].includes((booking.status || '').toLowerCase()) && (
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
