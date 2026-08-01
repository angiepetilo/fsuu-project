import { ShieldCheck, PackageOpen, User, Calendar, MapPin, Mail, Phone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Step4Verification({
  fullName,
  email,
  contactNumber,
  department,
  selectedItems = [],
  catalog = [],
  itemQuantities = {},
  startTime,
  endTime,
  placeOfUse,
  purpose,
  handlerName,
  notificationChannel = "email",
  isSubmitting,
  handleVerifySubmit,
  onBack,
}) {
  // Find selected equipment item details
  const selectedDetails = selectedItems.map(id => {
    const found = catalog.find(c => c.id === id);
    const qty = itemQuantities[id] || 1;
    return {
      id,
      name: found?.name || `Equipment Item #${id}`,
      dept: found?.dept || "avr",
      quantity: qty,
    };
  });

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      
      {/* Header Banner */}
      <div className="mb-6 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-400/30 mb-2 inline-block">
              Final Step • Requisition Review
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">Review & Submit Equipment Request</h3>
            <p className="text-xs text-slate-300 font-medium mt-1">
              Please double check your borrowing details below before final submission.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <ShieldCheck size={28} />
          </div>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-xs">
        
        {/* Card 1: Borrower Details */}
        <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
            <User size={16} className="text-blue-600" />
            <span>Borrower Identity & Contact</span>
          </h4>

          <div className="space-y-3 font-semibold text-slate-700">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Full Name</span>
              <span className="text-sm font-extrabold text-slate-900">{fullName || "—"}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Department / Program</span>
                <span className="font-bold text-slate-800">{department || "General"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Tracking Notification</span>
                <span className="font-bold text-emerald-700 capitalize flex items-center gap-1 mt-0.5">
                  {notificationChannel === "sms" ? <Phone size={12} /> : <Mail size={12} />}
                  Via {notificationChannel === "sms" ? "SMS" : "Email"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Email</span>
                <span className="font-semibold text-slate-800 truncate block">{email || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Contact Phone</span>
                <span className="font-semibold text-slate-800">{contactNumber || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Requisition Schedule & Location */}
        <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
            <Calendar size={16} className="text-blue-600" />
            <span>Usage Schedule & Location</span>
          </h4>

          <div className="space-y-3 font-semibold text-slate-700">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Place of Use / Venue</span>
              <span className="text-sm font-extrabold text-blue-700 flex items-center gap-1.5 mt-0.5">
                <MapPin size={14} className="text-blue-600 shrink-0" />
                {placeOfUse || "Inside Campus"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Start Datetime</span>
                <span className="font-bold text-slate-900">{startTime ? startTime.replace("T", " ") : "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Expected Return Datetime</span>
                <span className="font-bold text-slate-900">{endTime ? endTime.replace("T", " ") : "—"}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Purpose</span>
              <p className="font-medium text-slate-800 mt-0.5 leading-relaxed">
                {purpose || "Academic / Event Requisition"} {handlerName ? `(Handler: ${handlerName})` : ""}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Selected Items Card */}
      <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 mb-8">
        <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 mb-3">
          <PackageOpen size={16} className="text-blue-600" />
          <span>Selected Equipment Items ({selectedDetails.reduce((acc, curr) => acc + curr.quantity, 0)} Total Units)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {selectedDetails.map((item) => (
            <div key={item.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                  item.dept === "sco" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {item.quantity}x
                </div>
                <div>
                  <h5 className="font-extrabold text-slate-900 text-xs truncate max-w-[150px]">{item.name}</h5>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{item.dept === "sco" ? "SCO Asset" : "AVR Resource"}</span>
                </div>
              </div>
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onBack && onBack()}
          className="border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-5 rounded-xl font-bold text-xs cursor-pointer"
        >
          ← Back to Details
        </Button>

        <Button
          onClick={handleVerifySubmit}
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-5 rounded-xl font-extrabold text-xs shadow-xl shadow-emerald-600/20 transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2 cursor-pointer"
        >
          <ShieldCheck size={18} />
          <span>{isSubmitting ? "Submitting Request…" : "Submit Borrowing Request"}</span>
        </Button>
      </div>
    </div>
  );
}
