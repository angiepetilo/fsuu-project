import { useState } from "react";
import { Search, Mail, Hash, User, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";

export default function TrackBooking() {
  const [hasSearched, setHasSearched] = useState(false);
  const [isFound, setIsFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [trackCode, setTrackCode] = useState("");
  const [trackEmail, setTrackEmail] = useState("");

  const handleTrack = async (e) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(false);
    setBooking(null);
    try {
      const { data } = await api.post('/public/track', {
        reference_code: trackCode.trim().toUpperCase(),
        requestor_email: trackEmail.trim(),
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

  const getStatusBadge = (status) => {
    const map = {
      pending:  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold uppercase rounded-full">Pending</span>,
      approved: <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-xs font-bold uppercase rounded-full">Approved</span>,
      rejected: <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold uppercase rounded-full">Rejected</span>,
      cancelled:<span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold uppercase rounded-full">Cancelled</span>,
    };
    return map[status] ?? <span className="px-3 py-1 bg-blue-100 text-blue-500 text-xs font-bold uppercase rounded-full">{status}</span>;
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

      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl p-8 md:p-12 w-full shadow-lg">
        <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-2">Find your Campus Reservation</h2>
        <p className="text-slate-500 text-center mb-10 font-medium">Enter your unique Reference Number, Filer's Email, and Last Name to track real-time status.</p>
        
        <form onSubmit={handleTrack} className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-900">Reference Code <span className="text-red-500">*</span></label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={trackCode}
                onChange={e => setTrackCode(e.target.value)}
                placeholder="e.g., VN-2026001 or EQ-2026001"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-900 text-sm transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-900">Email Address <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                value={trackEmail}
                onChange={e => setTrackEmail(e.target.value)}
                placeholder="Email used when booking"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-900 text-sm transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full py-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base mt-2 shadow-md flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5">
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
            {loading ? "Searching…" : "Search & Track Status"}
          </Button>
        </form>

        {hasSearched && !isFound && (
          <div className="text-center p-6 text-red-500 font-semibold bg-red-50 border border-red-100 rounded-xl animate-in fade-in zoom-in-95">
            No booking found matching these details. Please verify your tracking number and email.
          </div>
        )}

        {hasSearched && isFound && booking && (
          <div className="mt-8 pt-8 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <span className="text-xl font-bold text-slate-900">{booking.reference_code}</span>
              {getStatusBadge(booking.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Requestor</span>
                <span className="text-base font-semibold text-slate-900">{booking.requestor_name}</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Purpose</span>
                <span className="text-base font-semibold text-slate-900">{booking.purpose}</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Start</span>
                <span className="text-base font-semibold text-slate-900">{booking.start_datetime ? new Date(booking.start_datetime).toLocaleString() : '—'}</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">End</span>
                <span className="text-base font-semibold text-slate-900">{booking.end_datetime ? new Date(booking.end_datetime).toLocaleString() : '—'}</span>
              </div>
            </div>

            {/* Progress Tracker */}
            <div className="mt-4 px-2">
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
      </div>
    </div>
  );
}
