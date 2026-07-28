import { useState } from "react";
import { Search, Hash, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
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

  const getStatusBadge = (status) => {
    const map = {
      pending:   <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold uppercase rounded-full border border-amber-200">Pending</span>,
      approved:  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase rounded-full border border-emerald-200">Approved</span>,
      rejected:  <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold uppercase rounded-full border border-rose-200">Rejected</span>,
      cancelled: <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold uppercase rounded-full border border-slate-200">Cancelled</span>,
    };
    return map[(status || "").toLowerCase()] ?? <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold uppercase rounded-full">{status}</span>;
  };

  const getProgressWidth = (status) => {
    const s = (status || "").toLowerCase();
    const map = { pending: "25%", approved: "75%", rejected: "100%", cancelled: "100%", completed: "100%" };
    return map[s] ?? "25%";
  };

  const currentStep = booking ? (
    (booking.status || "").toLowerCase() === "pending" ? 1 :
    (booking.status || "").toLowerCase() === "approved" ? 3 : 4
  ) : 0;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto relative animate-in fade-in duration-500">
      
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 w-full shadow-xs">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-2">
          Track Reservation Status
        </h2>
        <p className="text-slate-500 text-xs text-center mb-8 font-semibold">
          Enter your unique Reference Code to check real-time approval & schedule status.
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
                placeholder="e.g. VN-2607-0001 or EQ-2607-0001"
                required
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold transition-all focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all mt-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {loading ? "Searching..." : "Track Status"}
          </Button>
        </form>

        {hasSearched && !isFound && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs font-bold text-rose-700 flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            No reservation found matching reference code "{trackCode}". Please check your code and try again.
          </div>
        )}

        {hasSearched && isFound && booking && (
          <div className="mt-8 pt-8 border-t border-slate-200/80 space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Reference Code</span>
                <span className="text-lg font-extrabold text-slate-900">{booking.reference_code || trackCode}</span>
              </div>
              {getStatusBadge(booking.status)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Requestor</span>
                <span className="text-sm font-bold text-slate-900">{booking.filer_name || booking.requestor_name || "—"}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Purpose</span>
                <span className="text-sm font-bold text-slate-900">{booking.purpose || "—"}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Date of Usage</span>
                <span className="text-sm font-bold text-slate-900">
                  {booking.date_of_usage ? new Date(booking.date_of_usage).toLocaleDateString() : (booking.start_datetime ? new Date(booking.start_datetime).toLocaleDateString() : "—")}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Classification</span>
                <span className="text-sm font-bold text-slate-900 capitalize">{booking.classification || "—"}</span>
              </div>
            </div>

            {/* Progress Tracker */}
            <div className="pt-4">
              <div className="relative flex justify-between mb-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0 rounded-full" />
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-10 rounded-full transition-all duration-700 ease-out"
                  style={{ width: getProgressWidth(booking.status) }}
                />
                
                {[1, 2, 3, 4].map((step) => {
                  const isActive = step === currentStep;
                  const isCompleted = step < currentStep;
                  
                  return (
                    <div 
                      key={step}
                      className={`relative z-20 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all
                        ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' : ''}
                        ${isActive ? 'bg-slate-900 border-blue-600 text-white ring-4 ring-blue-600/20' : ''}
                        ${!isCompleted && !isActive ? 'bg-white border-slate-300 text-slate-400' : ''}
                      `}
                    >
                      {isCompleted ? <CheckCircle2 size={16} /> : step}
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>Submitted</span>
                <span>Review</span>
                <span>Approved</span>
                <span>Ready</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
