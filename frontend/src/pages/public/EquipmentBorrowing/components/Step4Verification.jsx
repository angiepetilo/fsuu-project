import { ShieldCheck, PackageOpen, User, Calendar, MapPin, Mail, Phone, CheckCircle2 } from "lucide-react";
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

  const formatScheduleRange = (startStr, endStr) => {
    if (!startStr) return "—";
    const [dStart, tStart] = (startStr || "").replace("T", " ").split(" ");
    const [dEnd, tEnd] = (endStr || "").replace("T", " ").split(" ");

    const formatT = (t, fallback = "08:00") => {
      const timeVal = t || fallback;
      const [h, m] = timeVal.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = (h % 12) || 12;
      return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
    };

    const timeStartFmt = formatT(tStart, "08:00");
    const timeEndFmt = formatT(tEnd, "17:00");

    if (dStart === dEnd || !dEnd) {
      return `${dStart} (${timeStartFmt} - ${timeEndFmt})`;
    }
    return `${dStart} (${timeStartFmt}) to ${dEnd} (${timeEndFmt})`;
  };

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      
      {/* Side-by-Side Grid Layout matching Venue Booking Step 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

        {/* ── Left Column: Selected Equipment Items & Purpose ── */}
        <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <PackageOpen size={16} className="text-blue-600 shrink-0" />
            <span>1. Requisition Items ({selectedDetails.reduce((acc, curr) => acc + curr.quantity, 0)} Total Units)</span>
          </h3>

          <div className="space-y-2">
            {selectedDetails.map((item) => (
              <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                    item.dept === "sco" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {item.quantity}x
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-900 text-xs truncate max-w-[200px]">{item.name}</h5>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase">{item.dept === "sco" ? "SCO Asset" : "AVR Resource"}</span>
                  </div>
                </div>
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200/70 space-y-1">
            <span className="text-slate-400 text-[10.5px] uppercase font-extrabold block">Purpose of Requisition:</span>
            <p className="text-xs font-semibold text-slate-800 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/80">
              {purpose || "Academic / Event Requisition"} {handlerName ? `(Designated Operator: ${handlerName})` : ""}
            </p>
          </div>
        </div>

        {/* ── Right Column: Verification Summary & Policy Agreement ── */}
        <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 space-y-5">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            2. Requisition Verification
          </h3>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Borrower Name</span>
              <span className="font-bold text-slate-900">{fullName || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Account Email</span>
              <span className="font-bold text-slate-900">{email || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Contact Phone</span>
              <span className="font-bold text-slate-900">{contactNumber || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Department / Office</span>
              <span className="font-bold text-slate-900">{department || "General"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Place of Use / Venue</span>
              <span className="font-bold text-blue-700">{placeOfUse || "Inside Campus"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Date &amp; Schedule</span>
              <span className="font-extrabold text-blue-700">{formatScheduleRange(startTime, endTime)}</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-400 font-bold">Status Notification</span>
              <span className="font-bold text-emerald-700">SMS &amp; Email Dispatch</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] font-semibold text-blue-900 leading-snug">
            By submitting this requisition, you agree to inspect physical units at the AVR counter upon release and return them in good condition on time.
          </div>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
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
          <span>{isSubmitting ? "Submitting Request…" : "Submit Equipment Request"}</span>
        </Button>
      </div>
    </div>
  );
}
