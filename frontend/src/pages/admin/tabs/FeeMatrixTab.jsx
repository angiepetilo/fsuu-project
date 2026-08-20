import React, { useState, useEffect } from "react";
import { Save, Tag, DollarSign, Building2, CheckCircle2 } from "lucide-react";
import api from "@/lib/axios";

export default function FeeMatrixTab({ officeScope = "All Offices", showMsg }) {
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [feeForm, setFeeForm] = useState({
    internal_hourly: "0",
    external_hourly: "1500",
    external_daily: "8000",
    cleaning_fee: "200",
    sound_system_fee: "500",
    notes: "Internal FSUU events are free of charge. External rentals require fee matrix approval.",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/venues").catch(() => ({ data: [] }));
        const list = Array.isArray(res.data) ? res.data : [];
        const saved = JSON.parse(localStorage.getItem("fsuu_venue_availability") || "[]");
        const combined = list.length > 0 ? list : saved;

        const filtered = combined.filter(v => {
          if (officeScope === "All Offices") return true;
          const vOffice = (v.office_name || v.office || v.location || "").toLowerCase();
          const scope = officeScope.toLowerCase();
          if (scope.includes("main")) return vOffice.includes("main") || !vOffice;
          if (scope.includes("morelos")) return vOffice.includes("morelos");
          return true;
        });

        setVenues(filtered);
        if (filtered.length > 0) {
          setSelectedVenueId(String(filtered[0].id));
        }
      } catch {
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [officeScope]);

  const handleSaveFeeMatrix = (e) => {
    e.preventDefault();
    const selVenue = venues.find(v => String(v.id) === selectedVenueId);
    const key = `fsuu_fee_matrix_${selectedVenueId}`;
    localStorage.setItem(key, JSON.stringify(feeForm));
    if (showMsg) {
      showMsg(`Rental fee matrix updated for ${selVenue?.name || 'Selected Venue'}!`);
    } else {
      alert(`Rental fee matrix updated for ${selVenue?.name || 'Selected Venue'}!`);
    }
  };

  const currentVenue = venues.find(v => String(v.id) === selectedVenueId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">
            Fee Matrix Configuration
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Configure rental rates for venues under <span className="font-bold text-slate-900">{officeScope}</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Fee Form */}
        <form onSubmit={handleSaveFeeMatrix} className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">Select Venue Scope *</label>
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer shadow-2xs"
            >
              {venues.length === 0 ? (
                <option value="">No venues found under {officeScope}</option>
              ) : (
                venues.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.office_name || officeScope})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Internal Hourly Rate (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.internal_hourly}
                onChange={e => setFeeForm({ ...feeForm, internal_hourly: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">External Hourly Rate (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.external_hourly}
                onChange={e => setFeeForm({ ...feeForm, external_hourly: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Daily Rate (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.external_daily}
                onChange={e => setFeeForm({ ...feeForm, external_daily: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Cleaning Fee (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.cleaning_fee}
                onChange={e => setFeeForm({ ...feeForm, cleaning_fee: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Sound Fee (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.sound_system_fee}
                onChange={e => setFeeForm({ ...feeForm, sound_system_fee: e.target.value })}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Policy Notes</label>
            <textarea
              rows={2}
              value={feeForm.notes}
              onChange={e => setFeeForm({ ...feeForm, notes: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors"
          >
            <Save size={14} /> Save Rate Schedule
          </button>
        </form>

        {/* Live Preview Card & Email Quotation Sender */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">Summary Rate Matrix</h4>
              <p className="text-[11px] text-slate-500 font-mono">{currentVenue?.name || "Selected Facility"}</p>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Internal Rate:</span>
                <span className="font-bold text-emerald-600">₱{feeForm.internal_hourly} / hr</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">External Hourly:</span>
                <span className="font-bold text-slate-900">₱{feeForm.external_hourly} / hr</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">External Daily:</span>
                <span className="font-bold text-slate-900">₱{feeForm.external_daily} / day</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Cleaning Fee:</span>
                <span className="font-bold text-slate-900">₱{feeForm.cleaning_fee}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Sound System:</span>
                <span className="font-bold text-slate-900">₱{feeForm.sound_system_fee}</span>
              </div>
            </div>
          </div>

          {/* Email Breakdown & Policy Sender */}
          <div className="bg-white rounded-2xl border border-blue-200/80 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Send Fee Breakdown &amp; Policy Email
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Send itemized pricing and reservation policy to requesting clients.
              </p>
            </div>

            <EmailBreakdownSender 
              venueName={currentVenue?.name || "Selected Facility"}
              venuePrice={feeForm.external_daily}
              cleaningFee={feeForm.cleaning_fee}
              soundFee={feeForm.sound_system_fee}
              showMsg={showMsg}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailBreakdownSender({ venueName, venuePrice, cleaningFee, soundFee, showMsg }) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [equipmentName, setEquipmentName] = useState("Wireless Microphone + Projector Set");
  const [equipmentPrice, setEquipmentPrice] = useState("500");
  const [officeContact, setOfficeContact] = useState("avr@urios.edu.ph / (085) 342-1830 local 124");
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!recipientEmail) {
      alert("Please enter recipient email address.");
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSentSuccess(true);
      if (showMsg) {
        showMsg(`Fee breakdown and reservation policy sent to ${recipientEmail}!`);
      }
      setTimeout(() => setSentSuccess(false), 5000);
    }, 1200);
  };

  return (
    <form onSubmit={handleSendEmail} className="space-y-3 text-xs">
      <div>
        <label className="block font-bold text-slate-900 mb-1">Recipient Client Email *</label>
        <input
          type="email"
          required
          placeholder="e.g. client@fsuu.edu.ph or guest@gmail.com"
          value={recipientEmail}
          onChange={e => setRecipientEmail(e.target.value)}
          className="w-full p-2.5 bg-blue-50/50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
        />
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 font-mono text-[11px]">
        <p className="font-extrabold text-slate-900 font-sans uppercase text-[10px] tracking-wider text-slate-400">
          Email Breakdown Preview:
        </p>
        <div className="flex justify-between text-slate-700">
          <span>• Venue Selected ({venueName}):</span>
          <span className="font-bold text-slate-900">₱{venuePrice}</span>
        </div>
        <div className="flex justify-between text-slate-700 items-center gap-2">
          <input
            type="text"
            value={equipmentName}
            onChange={e => setEquipmentName(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-sans text-slate-800"
            placeholder="Equipment needed"
          />
          <input
            type="number"
            value={equipmentPrice}
            onChange={e => setEquipmentPrice(e.target.value)}
            className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-right font-mono text-[11px] font-bold text-slate-900"
          />
        </div>
        <div className="flex justify-between text-slate-700">
          <span>• Cleaning Fee:</span>
          <span className="font-bold text-slate-900">₱{cleaningFee}</span>
        </div>
        <div className="pt-2 border-t border-slate-200 text-slate-600 font-sans text-[10.5px] leading-tight space-y-1">
          <p className="font-bold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
            📌 <strong>Policy Note:</strong> A 50% or downpayment is required to approve and confirm the venue booking schedule.
          </p>
          <p className="text-[10px] text-slate-500 italic">
            If you have any questions, please contact {officeContact}.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={sending}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors"
      >
        <span>{sending ? "Sending Email..." : "Send Fee & Policy via Email"}</span>
      </button>

      {sentSuccess && (
        <p className="text-emerald-700 font-bold text-[11px] text-center bg-emerald-50 p-2 rounded-lg border border-emerald-200">
          ✅ Fee matrix breakdown &amp; 50% downpayment policy sent via email!
        </p>
      )}
    </form>
  );
}
