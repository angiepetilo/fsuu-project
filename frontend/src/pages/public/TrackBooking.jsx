import { useState } from "react";
import { Search, Hash, CheckCircle2, Loader2, Calendar, User, FileText, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppCard } from "@/components/ui/app-card";
import { StatusBadge } from "@/components/ui/status-badge";
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

  const formatSchedule = (startStr, endStr) => {
    if (!startStr) return "—";
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : null;

    const dateOpt = { year: "numeric", month: "short", day: "numeric" };
    const timeOpt = { hour: "2-digit", minute: "2-digit", hour12: true };

    const startDateFormatted = start.toLocaleDateString("en-US", dateOpt);
    const startTimeFormatted = start.toLocaleTimeString("en-US", timeOpt);

    if (!end) return `${startDateFormatted} at ${startTimeFormatted}`;

    const endDateFormatted = end.toLocaleDateString("en-US", dateOpt);
    const endTimeFormatted = end.toLocaleTimeString("en-US", timeOpt);

    if (startDateFormatted === endDateFormatted) {
      return `${startDateFormatted} • ${startTimeFormatted} - ${endTimeFormatted}`;
    }
    return `${startDateFormatted}, ${startTimeFormatted} – ${endDateFormatted}, ${endTimeFormatted}`;
  };

  const currentStep = booking ? (
    booking.status === "pending" ? 1 :
    booking.status === "approved" || booking.status === "ongoing" || booking.status === "ready" ? 3 : 4
  ) : 0;

  const progressWidths = {
    pending: "25%",
    approved: "75%",
    ongoing: "85%",
    ready: "100%",
    completed: "100%",
    rejected: "100%",
    cancelled: "100%"
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-6 sm:py-10 px-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
      
      <AppCard className="p-6 sm:p-10 w-full rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Search size={22} className="stroke-[2.5]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Find your Campus Reservation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 max-w-md mx-auto leading-relaxed">
            Enter your unique Reference Code (e.g., <code className="font-mono text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">VN-2026-0001</code> or <code className="font-mono text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">EQ-2026-0001</code>) to track real-time status.
          </p>
        </div>
        
        {/* Search Form */}
        <form onSubmit={handleTrack} className="space-y-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Reference Code <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={trackCode}
                onChange={e => setTrackCode(e.target.value.toUpperCase())}
                placeholder="e.g., VN-2026-0001 or EQ-2026-0001"
                required
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 font-mono font-extrabold uppercase tracking-wide placeholder:normal-case placeholder:font-sans placeholder:text-slate-400"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !trackCode.trim()}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs tracking-wide shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>{loading ? "Searching Status…" : "Search & Track Status"}</span>
          </Button>
        </form>

        {/* Not Found Error Alert */}
        {hasSearched && !isFound && (
          <div className="p-4 bg-red-50 border border-red-200/80 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-3 animate-in fade-in zoom-in-95">
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            <div>
              No reservation record found for reference code <code className="font-mono font-bold uppercase">{trackCode}</code>. Please verify the code and try again.
            </div>
          </div>
        )}

        {/* Found Result Details */}
        {hasSearched && isFound && booking && (
          <div className="mt-8 pt-8 border-t border-slate-100 space-y-6 animate-in fade-in duration-500">
            
            {/* Header: Tracking Code & Status Badge */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Tracking Code</p>
                <p className="text-lg font-black font-mono text-blue-600 mt-0.5">{booking.reference_code}</p>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            {/* Requestor & Details Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User size={12} className="text-slate-500" />
                  <span>Requestor</span>
                </p>
                <p className="text-sm font-extrabold text-slate-900">{booking.requestor_name}</p>
                {booking.requestor_identity_type && (
                  <p className="text-[11px] text-slate-500 font-medium capitalize">{booking.requestor_identity_type}</p>
                )}
              </div>

              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calendar size={12} className="text-slate-500" />
                  <span>Schedule</span>
                </p>
                <p className="text-xs font-bold text-slate-900 font-mono">
                  {formatSchedule(booking.start_datetime, booking.end_datetime)}
                </p>
              </div>
            </div>

            {/* Purpose */}
            {booking.purpose && (
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText size={12} className="text-slate-500" />
                  <span>Purpose / Event</span>
                </p>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">{booking.purpose}</p>
              </div>
            )}

            {/* Step Progress Tracker */}
            <div className="pt-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-4">Reservation Stage</p>
              
              <div className="relative flex justify-between mb-3 px-2">
                {/* Track Line Background */}
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full" />
                {/* Track Line Fill */}
                <div 
                  className="absolute top-1/2 left-4 h-1 bg-blue-600 -translate-y-1/2 z-10 rounded-full transition-all duration-700 ease-out"
                  style={{ width: progressWidths[booking.status] ?? "33%" }}
                />
                
                {/* Steps */}
                {[1, 2, 3, 4].map((step) => {
                  const isActive = step === currentStep;
                  const isCompleted = step < currentStep;
                  const isPending = step > currentStep;
                  
                  return (
                    <div 
                      key={step}
                      className={`relative z-20 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isCompleted
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : isActive
                            ? 'bg-white border-blue-600 text-blue-600 ring-4 ring-blue-600/10 scale-105'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={15} className="text-white" /> : step}
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between text-[11px] font-bold text-slate-500 px-1">
                <span className={currentStep >= 1 ? 'text-blue-600 font-extrabold' : ''}>Submitted</span>
                <span className={currentStep >= 2 ? 'text-blue-600 font-extrabold' : ''}>Reviewing</span>
                <span className={currentStep >= 3 ? 'text-blue-600 font-extrabold' : ''}>Approved</span>
                <span className={currentStep >= 4 ? 'text-blue-600 font-extrabold' : ''}>Ready</span>
              </div>
            </div>

          </div>
        )}

      </AppCard>
    </div>
  );
}
