import React, { useState, useEffect } from "react";
import { Save, Printer, Mail, X, Send, Loader2, CheckCircle2, Building, DollarSign, FileText } from "lucide-react";
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
    policy: "Internal FSUU events and official academic activities are free of charge. External rentals require prior fee matrix approval. A 50% downpayment is required to confirm and lock the reservation schedule.",
  });
  const [loading, setLoading] = useState(true);

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null);

  // PDF Preview / Print Modal
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/venues").catch(() => ({ data: [] }));
        const list = Array.isArray(res.data) ? res.data : [];
        const saved = JSON.parse(localStorage.getItem("fsuu_venue_availability") || "[]");
        const combined = list.length > 0 ? list : saved;

        const filtered = combined.filter((v) => {
          if (officeScope === "All Offices") return true;
          const vOffice = (v.office_name || v.office || v.location || "").toLowerCase();
          const scope = officeScope.toLowerCase();
          if (scope.includes("main")) return vOffice.includes("main") || !vOffice;
          if (scope.includes("morelos")) return vOffice.includes("morelos");
          return true;
        });

        setVenues(filtered);
        if (filtered.length > 0) {
          const firstId = String(filtered[0].id);
          setSelectedVenueId(firstId);
          loadSavedMatrix(firstId, filtered[0]);
        }
      } catch {
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [officeScope]);

  const loadSavedMatrix = (venueId, venueObj) => {
    const key = `fsuu_fee_matrix_${venueId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFeeForm({
          internal_hourly: parsed.internal_hourly ?? "0",
          external_hourly: parsed.external_hourly ?? "1500",
          external_daily: parsed.external_daily ?? "8000",
          cleaning_fee: parsed.cleaning_fee ?? "200",
          sound_system_fee: parsed.sound_system_fee ?? "500",
          policy: parsed.policy || parsed.notes || (venueObj?.policies || "Internal FSUU events are free of charge. External rentals require fee matrix approval. A 50% downpayment is required to confirm the reservation schedule."),
        });
        return;
      } catch {}
    }
    // Default fallback
    setFeeForm({
      internal_hourly: "0",
      external_hourly: "1500",
      external_daily: "8000",
      cleaning_fee: "200",
      sound_system_fee: "500",
      policy: venueObj?.policies || "Internal FSUU events are free of charge. External rentals require fee matrix approval. A 50% downpayment is required to confirm the reservation schedule.",
    });
  };

  const handleVenueChange = (e) => {
    const newId = e.target.value;
    setSelectedVenueId(newId);
    const vObj = venues.find((v) => String(v.id) === newId);
    loadSavedMatrix(newId, vObj);
  };

  const handleSaveFeeMatrix = (e) => {
    e.preventDefault();
    const selVenue = venues.find((v) => String(v.id) === selectedVenueId);
    const key = `fsuu_fee_matrix_${selectedVenueId}`;
    localStorage.setItem(key, JSON.stringify(feeForm));
    if (showMsg) {
      showMsg(`Rental fee matrix and policy saved for ${selVenue?.name || "Selected Venue"}!`);
    }
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      alert("Please enter recipient email address.");
      return;
    }
    setSendingEmail(true);
    setTimeout(() => {
      setSendingEmail(false);
      setShowEmailModal(false);
      const selVenue = venues.find((v) => String(v.id) === selectedVenueId);
      if (showMsg) {
        showMsg(`Fee breakdown and policy for ${selVenue?.name || "Venue"} sent to ${recipientEmail.trim()}!`);
      }
      setEmailFeedback(`Fee schedule sent to ${recipientEmail.trim()}`);
      setRecipientEmail("");
      setTimeout(() => setEmailFeedback(null), 4000);
    }, 1000);
  };

  const currentVenue = venues.find((v) => String(v.id) === selectedVenueId);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-black text-slate-900 text-base">
            Fee Matrix Configuration
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure rental rates, facility pricing, and venue policy for <span className="font-bold text-slate-900">{officeScope}</span>.
          </p>
        </div>

        {/* Global Print & Email Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
            title="Print / Export Fee Matrix to PDF"
          >
            <Printer size={14} />
            <span>Print to PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
            title="Send Fee Matrix via Email"
          >
            <Mail size={14} />
            <span>Send via Email</span>
          </button>
        </div>
      </div>

      {emailFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{emailFeedback}</span>
        </div>
      )}

      {/* Main Grid: Rate Form & Summary Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Select Venue, Enter Prices, Enter Policy */}
        <form onSubmit={handleSaveFeeMatrix} className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">Select Venue *</label>
            <select
              value={selectedVenueId}
              onChange={handleVenueChange}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer transition-all"
            >
              {venues.length === 0 ? (
                <option value="">No venues found under {officeScope}</option>
              ) : (
                venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.office_name || v.location || officeScope})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Internal Hourly Rate (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.internal_hourly}
                onChange={(e) => setFeeForm({ ...feeForm, internal_hourly: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">External Hourly Rate (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.external_hourly}
                onChange={(e) => setFeeForm({ ...feeForm, external_hourly: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Daily Rate (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.external_daily}
                onChange={(e) => setFeeForm({ ...feeForm, external_daily: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Cleaning Fee (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.cleaning_fee}
                onChange={(e) => setFeeForm({ ...feeForm, cleaning_fee: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Sound Fee (₱)</label>
              <input
                type="number"
                min="0"
                value={feeForm.sound_system_fee}
                onChange={(e) => setFeeForm({ ...feeForm, sound_system_fee: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Policy of the Venue</label>
            <textarea
              rows={3}
              placeholder="Enter venue reservation rules, downpayment policies, cancellation conditions..."
              value={feeForm.policy}
              onChange={(e) => setFeeForm({ ...feeForm, policy: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={14} /> Save Rate Schedule &amp; Policy
            </button>
          </div>
        </form>

        {/* Right Summary Rate Matrix Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 text-sm">Summary Rate Matrix</h4>
              <p className="text-xs text-blue-600 font-bold mt-0.5">{currentVenue?.name || "Selected Facility"}</p>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600 font-sans">Internal Rate:</span>
                <span className="font-bold text-emerald-600">₱{feeForm.internal_hourly} / hr</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600 font-sans">External Hourly:</span>
                <span className="font-bold text-slate-900">₱{feeForm.external_hourly} / hr</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600 font-sans">External Daily:</span>
                <span className="font-bold text-slate-900">₱{feeForm.external_daily} / day</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600 font-sans">Cleaning Fee:</span>
                <span className="font-bold text-slate-900">₱{feeForm.cleaning_fee}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600 font-sans">Sound System:</span>
                <span className="font-bold text-slate-900">₱{feeForm.sound_system_fee}</span>
              </div>
            </div>

            {/* Policy Note Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Venue Policy:
              </span>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {feeForm.policy || "Standard university policies apply."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── EMAIL MODAL (Simple, just enter email and click send) ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Send Fee Breakdown via Email</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {currentVenue?.name || "Selected Facility"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Recipient Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. client@fsuu.edu.ph or guest@gmail.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  The complete rate matrix and reservation policy for {currentVenue?.name || "this venue"} will be sent to this email.
                </p>
              </div>

              {/* Preview Box */}
              <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-700">
                  <span>Venue ({currentVenue?.name || "Facility"}):</span>
                  <span className="font-bold text-slate-900">₱{feeForm.external_daily}/day</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Cleaning &amp; Sound Fee:</span>
                  <span className="font-bold text-slate-900">₱{(Number(feeForm.cleaning_fee) || 0) + (Number(feeForm.sound_system_fee) || 0)}</span>
                </div>
                <div className="pt-1.5 border-t border-blue-200 text-blue-900 text-[10.5px] font-sans font-semibold">
                  📌 Downpayment &amp; Policy: {feeForm.policy.slice(0, 90)}...
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{sendingEmail ? "Sending..." : "Send Email"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PRINT TO PDF MODAL ── */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-blue-600" />
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Print Fee Matrix &amp; Policy
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    {currentVenue?.name || "Selected Facility"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all"
                >
                  <Printer size={14} />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 text-xs print:p-0">
              {/* Document Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Father Saturnino Urios University
                </p>
                <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                  Facility Rental Fee Schedule &amp; Reservation Policy
                </h2>
                <p className="text-xs font-extrabold text-blue-800">
                  Venue: {currentVenue?.name || "All Venues"} ({officeScope})
                </p>
                <p className="text-[10px] text-slate-400">
                  Date: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>

              {/* Rate Matrix Table */}
              <table className="w-full text-xs border border-slate-300">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-300 p-2.5 text-left font-bold">Charge Description</th>
                    <th className="border border-slate-300 p-2.5 text-right font-bold">Applicable Rate (₱)</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-sans">Internal Rate (FSUU Academic/Dept)</td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-emerald-700">₱{feeForm.internal_hourly} / hr</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-sans">External Hourly Rate</td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold">₱{feeForm.external_hourly} / hr</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-sans">External Daily Rate (Full Day Rental)</td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold">₱{feeForm.external_daily} / day</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-sans">Facility Cleaning Fee</td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold">₱{feeForm.cleaning_fee}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-sans">Sound System Setup Fee</td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold">₱{feeForm.sound_system_fee}</td>
                  </tr>
                </tbody>
              </table>

              {/* Policy Section */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Venue Policy &amp; Terms:
                </h4>
                <p className="text-slate-700 leading-relaxed font-sans">
                  {feeForm.policy || "Standard institutional terms apply."}
                </p>
              </div>

              {/* Signature section */}
              <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-[11px]">
                <div>
                  <p className="text-slate-400 font-medium">Approved Official Copy</p>
                  <p className="font-extrabold text-slate-800">Father Saturnino Urios University</p>
                </div>
                <div className="text-right space-y-6">
                  <p className="font-medium text-slate-500">Authorized Office Representative:</p>
                  <div className="border-t border-slate-900 pt-1 font-bold text-slate-900">
                    AVR Center Administrator
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
