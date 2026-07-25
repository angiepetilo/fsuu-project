import { useState } from "react";
import { Search, Hash, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppCard } from "@/components/ui/app-card";
import api from "@/lib/axios";

export default function TrackBooking() {
  const [hasSearched, setHasSearched] = useState(false);
  const [isFound, setIsFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [trackCode, setTrackCode] = useState("");

  const handleTrack = async (e) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(false);
    setBooking(null);
    try {
      const { data } = await api.post('/public/track', {
        reference_code: trackCode.trim().toUpperCase(),
      });
      setIsFound(true);
      setBooking(data);
    } catch (err) {
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

    const dateOpt = { year: "numeric", month: "long", day: "numeric" };
    const timeOpt = { hour: "2-digit", minute: "2-digit", hour12: true };

    const startDateFormatted = start.toLocaleDateString("en-US", dateOpt);
    const startTimeFormatted = start.toLocaleTimeString("en-US", timeOpt);

    if (!end) return `${startDateFormatted} at ${startTimeFormatted}`;

    const endDateFormatted = end.toLocaleDateString("en-US", dateOpt);
    const endTimeFormatted = end.toLocaleTimeString("en-US", timeOpt);

    if (startDateFormatted === endDateFormatted) {
      return `${startDateFormatted} • ${startTimeFormatted} - ${endTimeFormatted}`;
    } else {
      return `${startDateFormatted}, ${startTimeFormatted} – ${endDateFormatted}, ${endTimeFormatted}`;
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending:  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-extrabold uppercase rounded-full">Pending</span>,
      approved: <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-xs font-extrabold uppercase rounded-full">Approved</span>,
      rejected: <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-extrabold uppercase rounded-full">Rejected</span>,
      cancelled:<span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-extrabold uppercase rounded-full">Cancelled</span>,
    };
    return map[status] ?? <span className="px-3 py-1 bg-blue-100 text-blue-500 text-xs font-extrabold uppercase rounded-full">{status}</span>;
  };

  const getProgressWidth = (status) => {
    const map = { pending: "0%", approved: "66%", rejected: "100%", cancelled: "100%" };
    return map[status] ?? "33%";
  };

  const currentStep = booking ? (
    booking.status === "pending" ? 1 :
    booking.status === "approved" ? 3 : 4
  ) : 0;

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto relative animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* Ambient background glow inside main content area */}
      <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-[radial-gradient(circle,_rgba(37,99,235,0.15)_0%,_transparent_70%)] z-[-1] pointer-events-none"></div>

      <AppCard className="p-6 sm:p-8 w-full shadow-md backdrop-blur-md">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center mb-2">Find your Campus Reservation</h2>
        <p className="text-slate-500 text-center mb-8 text-xs sm:text-sm font-medium">Enter your unique Reference Code (e.g., VN-2026-0001 or EQ-2026-0001) to track real-time status.</p>
        
        <form onSubmit={handleTrack} className="flex flex-col gap-5 mb-8">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-900">Reference Code <span className="text-red-500">*</span></label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={trackCode}
                onChange={e => setTrackCode(e.target.value)}
                placeholder="e.g., VN-2026-0001 or EQ-2026-0001"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-900 text-sm transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20 font-mono font-bold"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full py-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm mt-1 shadow-md flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {loading ? "Searching…" : "Search & Track Status"}
          </Button>
        </form>

        {hasSearched && !isFound && (
          <div className="text-center p-5 text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl text-xs sm:text-sm animate-in fade-in zoom-in-95">
            No booking found matching reference code "{trackCode}". Please double check your code.
          </div>
        )}

        {hasSearched && isFound && booking && (
          <div className="mt-8 pt-8 border-t border-slate-200/80 animate-in fade-in slide-in-from-bottom-3 duration-500">
            
            {/* Header: Code + Status Badge */}
            <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <span className="text-xl font-extrabold text-slate-900 font-mono tracking-wide">{booking.reference_code}</span>
              {getStatusBadge(booking.status)}
            </div>

            {/* 1. Requestor */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-4 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Requestor</span>
              <span className="text-base font-extrabold text-slate-900">{booking.requestor_name}</span>
            </div>

            {/* 2. Purpose */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-4 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Purpose</span>
              <span className="text-sm font-bold text-slate-800 leading-relaxed">{booking.purpose || '—'}</span>
            </div>

            {/* 3. Date & Time */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-8 flex flex-col gap-1">
              <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">Date &amp; Time</span>
              <span className="text-sm font-extrabold text-blue-600 bg-blue-50/80 border border-blue-100 px-3.5 py-2 rounded-xl w-fit mt-1">
                {formatSchedule(booking.start_datetime, booking.end_datetime)}
              </span>
            </div>

            {/* 4. Timeline Progress */}
            <div className="mt-6 px-2">
              <div className="relative flex justify-between mb-4">
                {/* Background line */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0 rounded-full"></div>
                {/* Fill line */}
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-10 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: getProgressWidth(booking.status) }}
                ></div>
                
                {/* Steps */}
                {[1, 2, 3, 4].map((step) => {
                  const isActive = step === currentStep;
                  const isCompleted = step < currentStep;
                  const isPending = step > currentStep;
                  
                  return (
                    <div 
                      key={step}
                      className={`relative z-20 w-8 h-8 rounded-full border-4 flex items-center justify-center text-xs font-bold transition-all duration-500
                        ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' : ''}
                        ${isActive ? 'bg-slate-900 border-blue-600 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-110' : ''}
                        ${isPending ? 'bg-slate-100 border-slate-200 text-slate-400' : ''}
                      `}
                    >
                      {isCompleted ? <CheckCircle2 size={16} className="text-white" /> : step}
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between text-xs font-medium px-0">
                <span className={`w-16 text-center ${currentStep >= 1 ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>Submitted</span>
                <span className={`w-20 text-center ${currentStep >= 2 ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>Under Review</span>
                <span className={`w-16 text-center ${currentStep >= 3 ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>Approved</span>
                <span className={`w-16 text-center ${currentStep >= 4 ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>Ready</span>
              </div>
            </div>
          </div>
        )}
      </AppCard>
    </div>
  );
}
