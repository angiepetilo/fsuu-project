import { useState } from "react";
import { Search, Hash, CheckCircle2, Loader2, AlertCircle, Building2, PackageOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";

export default function TrackBooking() {
  const [hasSearched, setHasSearched] = useState(false);
  const [isFound, setIsFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [trackCode, setTrackCode] = useState("");

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackCode.trim()) return;
    setLoading(true);
    setHasSearched(false);
    setBooking(null);
    try {
      const { data } = await api.post('/public/track', {
        reference_code: trackCode.trim().toUpperCase(),
      });
      setIsFound(true);
      setBooking(data);
    } catch {
      setIsFound(false);
      setBooking(null);
    } finally {
      setHasSearched(true);
      setLoading(false);
    }
  };

  const isVenue = booking?.type === 'venue' || (booking?.reference_code || trackCode).startsWith('VN') || (booking?.reference_code || trackCode).includes('AVR');

  // Timeline Step calculation per Item 32:
  // Venue steps: Pending (1) -> Approved (2) -> On-going (3) -> Inspection (4) -> Completed (5)
  // Equipment steps: Pending (1) -> Claim (2) -> Return (3) -> Inspection/Damage Tag (4) -> Completed (5)
  const getVenueStepIndex = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") return 1;
    if (s === "approved") return 2;
    if (s === "ongoing" || s === "on-going") return 3;
    if (s === "inspection" || s === "post-inspection") return 4;
    if (s === "completed") return 5;
    return 1;
  };

  const getEquipmentStepIndex = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") return 1;
    if (s === "approved" || s === "claim" || s === "claimed") return 2;
    if (s === "return" || s === "returned") return 3;
    if (s === "damaged" || s === "lost" || s === "inspection") return 4;
    if (s === "completed") return 5;
    return 1;
  };

  const currentStep = booking
    ? (isVenue ? getVenueStepIndex(booking.status) : getEquipmentStepIndex(booking.status))
    : 1;

  const venueSteps = [
    { label: "Pending", desc: "Awaiting admin approval" },
    { label: "Approved", desc: "Venue slot reserved" },
    { label: "On-going", desc: "Event in progress" },
    { label: "Inspection", desc: "Post-event check" },
    { label: "Completed", desc: "Clearance done" },
  ];

  const equipmentSteps = [
    { label: "Pending", desc: "Awaiting approval" },
    { label: "Claim", desc: "Ready to claim (Bring Institutional ID)" },
    { label: "Return", desc: "Return due at kiosk" },
    { label: "Inspection", desc: "Condition check" },
    { label: "Completed", desc: "Log closed" },
  ];

  const activeSteps = isVenue ? venueSteps : equipmentSteps;

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto relative animate-in fade-in duration-500">
      
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 w-full shadow-xs">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-2">
          Track Reservation & Loan Timeline
        </h2>
        <p className="text-slate-500 text-xs text-center mb-8 font-semibold">
          Enter your unique Tracking / Reference Code to view live progress & inspection updates.
        </p>
        
        <form onSubmit={handleTrack} className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Reference Code <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={trackCode}
                onChange={e => setTrackCode(e.target.value)}
                placeholder="e.g. TRK-AVR8921 or EQUIP-REQ-101"
                required
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold transition-all focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {loading ? "Searching Timeline..." : "Track Status"}
          </Button>
        </form>

        {hasSearched && !isFound && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs font-bold text-rose-700 flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            No reservation found matching reference code "{trackCode}". Please verify your reference code.
          </div>
        )}

        {hasSearched && isFound && booking && (
          <div className="mt-8 pt-8 border-t border-slate-200/80 space-y-6">
            
            {/* Header info */}
            <div className="flex justify-between items-center bg-slate-50 p-4.5 rounded-2xl border border-slate-200/60">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isVenue ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {isVenue ? <Building2 size={22} /> : <PackageOpen size={22} />}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isVenue ? "Venue Reservation Timeline" : "Equipment Borrowing Timeline"}
                  </span>
                  <span className="text-base font-extrabold text-slate-900">{booking.reference_code || trackCode}</span>
                </div>
              </div>

              <span className="px-3.5 py-1 rounded-full text-xs font-extrabold capitalize bg-blue-50 text-blue-800 border border-blue-200">
                {booking.status || "Pending"}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Requestor Filer</span>
                <span className="text-sm font-extrabold text-slate-900">{booking.filer_name || booking.requestor_name || "—"}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Item / Venue Name</span>
                <span className="text-sm font-extrabold text-blue-700">{booking.venue_name || booking.equipment_name || booking.purpose || "—"}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Department / Program</span>
                <span className="text-sm font-bold text-slate-800">{booking.program_office || booking.department || "Academic Dept"}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Date of Usage</span>
                <span className="text-sm font-bold text-slate-800">
                  {booking.date_of_usage ? new Date(booking.date_of_usage).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>

            {/* Item 32: 5-Step Timeline Tracker */}
            <div className="pt-6 space-y-6">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Progress Timeline ({isVenue ? "Venue Process" : "Equipment Kiosk Process"})
              </h4>

              <div className="relative flex justify-between items-start">
                
                {/* Connecting Line Track */}
                <div className="absolute top-4 left-[18px] right-[18px] -translate-y-1/2 h-1 z-0 bg-slate-200 rounded-full">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, (currentStep - 1) * 25))}%` }}
                  />
                </div>
                
                {activeSteps.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isActive = stepNum === currentStep;
                  const isCompleted = stepNum < currentStep;
                  
                  return (
                    <div key={idx} className="relative z-20 flex flex-col items-center text-center max-w-[100px]">
                      <div 
                        className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-extrabold transition-all
                          ${isCompleted ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : ''}
                          ${isActive ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-600/25 scale-110 shadow-md' : ''}
                          ${!isCompleted && !isActive ? 'bg-white border-slate-300 text-slate-400' : ''}
                        `}
                      >
                        {isCompleted ? <CheckCircle2 size={18} /> : stepNum}
                      </div>

                      <span className={`text-xs font-extrabold mt-2.5 block ${isActive ? 'text-blue-600' : 'text-slate-800'}`}>
                        {step.label}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5 hidden sm:block">
                        {step.desc}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Special Requirement Callout Tags (Item 32) */}
              {!isVenue && currentStep === 2 && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs font-bold flex items-center gap-2">
                  <PackageOpen size={18} className="text-blue-600 shrink-0" />
                  <span><strong>Ready for Claim:</strong> Please bring your <strong>Institutional Student/Employee ID</strong> to the equipment kiosk to collect items.</span>
                </div>
              )}

              {booking.has_violation || booking.status === 'damaged' || booking.status === 'lost' ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                  <span><strong>Inspection Flag:</strong> This reservation has recorded violations or equipment damage/loss fines. Please report to facility admin.</span>
                </div>
              ) : null}

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
