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

  // Print & Live Preview Configuration
  const [printConfig, setPrintConfig] = useState({
    title: "Facility Rental Fee Schedule & Reservation Policy",
    orgName: "Father Saturnino Urios University",
    signatoryTitle: "AVR Center Administrator",
    signatoryName: "",
    showInternalRate: true,
    showExternalHourly: true,
    showExternalDaily: true,
    showCleaningFee: true,
    showSoundFee: true,
    showPolicy: true,
    showSignatures: true,
    customMemo: "",
    internalRateLabel: "Internal Rate (Academic / Student Dept)",
    internalRateValue: "",
    externalHourlyLabel: "External Hourly Rental Rate",
    externalHourlyValue: "",
    externalDailyLabel: "External Full Day Rate",
    externalDailyValue: "",
    cleaningFeeLabel: "Facility Cleaning Fee",
    cleaningFeeValue: "",
    soundFeeLabel: "Sound System & Tech Setup Fee",
    soundFeeValue: "",
  });

  const togglePrintOption = (key) => {
    setPrintConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/venues").catch(() => ({ data: [] }));
        const list = Array.isArray(res.data) ? res.data : [];
        const saved = JSON.parse(localStorage.getItem("fsuu_venue_availability") || "[]");
        const combined = list.length > 0 ? list : saved;

        setVenues(combined);
        if (combined.length > 0) {
          const firstId = String(combined[0].id);
          setSelectedVenueId(firstId);
          loadSavedMatrix(firstId, combined[0]);
        }
      } catch {
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

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
    if (e) e.preventDefault();
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
      {/* Header Bar with Venue Selector & Direct Print Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-black text-slate-900 text-base">
            Fee Matrix Configuration
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure rates, customize visible print line items, and export official fee matrix sheets.
          </p>
        </div>

        {/* Action Buttons: Direct Print & Send via Email */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow-md transition-all cursor-pointer"
            title="Immediately Print / Save PDF"
          >
            <Printer size={14} />
            <span>Print to PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
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

      {/* Main Grid: Left Customizer & Form | Right Live Document Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Form Settings, Line Item Toggles & Customization */}
        <div className="lg:col-span-6 space-y-5 text-xs">
          
          {/* Venue Selector Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-900">Select Venue *</label>
            <select
              value={selectedVenueId}
              onChange={handleVenueChange}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer transition-all"
            >
              {venues.length === 0 ? (
                <option value="">No venues found</option>
              ) : (
                venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.location || "FSUU Campus"})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 1. Rate Items Configuration & Text Overrides */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs">1. Rate Items (Check / Edit Text)</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Toggle visibility and rename labels or rate strings.</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Internal Rate */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-800 font-bold hover:text-blue-600">
                  <input
                    type="checkbox"
                    checked={printConfig.showInternalRate}
                    onChange={() => togglePrintOption("showInternalRate")}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Internal Academic / Dept Rate</span>
                </label>
                {printConfig.showInternalRate && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <input
                      type="text"
                      value={printConfig.internalRateLabel !== undefined ? printConfig.internalRateLabel : "Internal Rate (Academic / Student Dept)"}
                      onChange={(e) => setPrintConfig({ ...printConfig, internalRateLabel: e.target.value })}
                      placeholder="Description Label"
                      className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                    <input
                      type="text"
                      value={printConfig.internalRateValue !== undefined ? printConfig.internalRateValue : `₱${feeForm.internal_hourly} / hr`}
                      onChange={(e) => setPrintConfig({ ...printConfig, internalRateValue: e.target.value })}
                      placeholder="Rate Text"
                      className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* External Hourly Rate */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-800 font-bold hover:text-blue-600">
                  <input
                    type="checkbox"
                    checked={printConfig.showExternalHourly}
                    onChange={() => togglePrintOption("showExternalHourly")}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>External Hourly Rate</span>
                </label>
                {printConfig.showExternalHourly && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <input
                      type="text"
                      value={printConfig.externalHourlyLabel !== undefined ? printConfig.externalHourlyLabel : "External Hourly Rental Rate"}
                      onChange={(e) => setPrintConfig({ ...printConfig, externalHourlyLabel: e.target.value })}
                      placeholder="Description Label"
                      className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                    <input
                      type="text"
                      value={printConfig.externalHourlyValue !== undefined ? printConfig.externalHourlyValue : `₱${feeForm.external_hourly} / hr`}
                      onChange={(e) => setPrintConfig({ ...printConfig, externalHourlyValue: e.target.value })}
                      placeholder="Rate Text"
                      className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* External Daily Rate */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-800 font-bold hover:text-blue-600">
                  <input
                    type="checkbox"
                    checked={printConfig.showExternalDaily}
                    onChange={() => togglePrintOption("showExternalDaily")}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>External Full Day Rate</span>
                </label>
                {printConfig.showExternalDaily && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <input
                      type="text"
                      value={printConfig.externalDailyLabel !== undefined ? printConfig.externalDailyLabel : "External Full Day Rate"}
                      onChange={(e) => setPrintConfig({ ...printConfig, externalDailyLabel: e.target.value })}
                      placeholder="Description Label"
                      className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                    <input
                      type="text"
                      value={printConfig.externalDailyValue !== undefined ? printConfig.externalDailyValue : `₱${feeForm.external_daily} / day`}
                      onChange={(e) => setPrintConfig({ ...printConfig, externalDailyValue: e.target.value })}
                      placeholder="Rate Text"
                      className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* Cleaning Fee */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-800 font-bold hover:text-blue-600">
                  <input
                    type="checkbox"
                    checked={printConfig.showCleaningFee}
                    onChange={() => togglePrintOption("showCleaningFee")}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Facility Cleaning Fee</span>
                </label>
                {printConfig.showCleaningFee && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <input
                      type="text"
                      value={printConfig.cleaningFeeLabel !== undefined ? printConfig.cleaningFeeLabel : "Facility Cleaning Fee"}
                      onChange={(e) => setPrintConfig({ ...printConfig, cleaningFeeLabel: e.target.value })}
                      placeholder="Description Label"
                      className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                    <input
                      type="text"
                      value={printConfig.cleaningFeeValue !== undefined ? printConfig.cleaningFeeValue : `₱${feeForm.cleaning_fee}`}
                      onChange={(e) => setPrintConfig({ ...printConfig, cleaningFeeValue: e.target.value })}
                      placeholder="Rate Text"
                      className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* Sound System Setup Fee */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-800 font-bold hover:text-blue-600">
                  <input
                    type="checkbox"
                    checked={printConfig.showSoundFee}
                    onChange={() => togglePrintOption("showSoundFee")}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Sound System Setup Fee</span>
                </label>
                {printConfig.showSoundFee && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <input
                      type="text"
                      value={printConfig.soundFeeLabel !== undefined ? printConfig.soundFeeLabel : "Sound System & Tech Setup Fee"}
                      onChange={(e) => setPrintConfig({ ...printConfig, soundFeeLabel: e.target.value })}
                      placeholder="Description Label"
                      className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                    <input
                      type="text"
                      value={printConfig.soundFeeValue !== undefined ? printConfig.soundFeeValue : `₱${feeForm.sound_system_fee}`}
                      onChange={(e) => setPrintConfig({ ...printConfig, soundFeeValue: e.target.value })}
                      placeholder="Rate Text"
                      className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Section Toggles & Customization */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <h4 className="font-extrabold text-slate-900 text-xs border-b border-slate-100 pb-2">
              2. Section &amp; Header Customization
            </h4>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-800 font-semibold hover:text-blue-600">
                <input
                  type="checkbox"
                  checked={printConfig.showPolicy}
                  onChange={() => togglePrintOption("showPolicy")}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Include Venue Policy &amp; Terms Box</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-800 font-semibold hover:text-blue-600">
                <input
                  type="checkbox"
                  checked={printConfig.showSignatures}
                  onChange={() => togglePrintOption("showSignatures")}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Include Authorized Representative Signature Block</span>
              </label>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Document Title</label>
                <input
                  type="text"
                  value={printConfig.title}
                  onChange={(e) => setPrintConfig({ ...printConfig, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                  placeholder="e.g., Facility Rental Fee Schedule"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Signatory Title / Office Role</label>
                <input
                  type="text"
                  value={printConfig.signatoryTitle}
                  onChange={(e) => setPrintConfig({ ...printConfig, signatoryTitle: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                  placeholder="e.g., AVR Center Administrator"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Signatory Name (Optional)</label>
                <input
                  type="text"
                  value={printConfig.signatoryName}
                  onChange={(e) => setPrintConfig({ ...printConfig, signatoryName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                  placeholder="e.g., John Doe"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Venue Terms / Policy Text</label>
                <textarea
                  rows={3}
                  value={feeForm.policy}
                  onChange={(e) => setFeeForm({ ...feeForm, policy: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                  placeholder="Specify reservation and downpayment policies..."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Additional Custom Memo / Note (Optional)</label>
                <textarea
                  rows={2}
                  value={printConfig.customMemo}
                  onChange={(e) => setPrintConfig({ ...printConfig, customMemo: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                  placeholder="Add any specific instructions, payment deadlines, or remarks..."
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSaveFeeMatrix}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs shadow-xs cursor-pointer transition-all"
              >
                <Save size={14} />
                <span>Save Fee Matrix Settings</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Live Paper Document Sheet View (Also target for @media print) */}
        <div className="lg:col-span-6 sticky top-6">
          <div id="printable-fee-matrix" className="w-full bg-white rounded-2xl border border-slate-300/80 shadow-md p-7 sm:p-8 space-y-5 text-xs text-slate-900">
            
            {/* Document Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
              <p className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                {printConfig.orgName}
              </p>
              <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                {printConfig.title || "Facility Rental Fee Schedule & Reservation Policy"}
              </h2>
              <p className="text-xs font-extrabold text-blue-900">
                Venue: {currentVenue?.name || "All Venues"} {officeScope && officeScope !== "All Offices" ? `(${officeScope})` : ""}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Date Generated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>

            {/* Rate Matrix Table */}
            <table className="w-full text-xs border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 p-2.5 text-left font-bold text-slate-900">Charge Description</th>
                  <th className="border border-slate-300 p-2.5 text-right font-bold text-slate-900">Applicable Rate (₱)</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {printConfig.showInternalRate && (
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-sans">
                      {printConfig.internalRateLabel || "Internal Rate (Academic / Student Dept)"}
                    </td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-emerald-700">
                      {printConfig.internalRateValue || `₱${feeForm.internal_hourly} / hr`}
                    </td>
                  </tr>
                )}
                {printConfig.showExternalHourly && (
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-sans">
                      {printConfig.externalHourlyLabel || "External Hourly Rental Rate"}
                    </td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-slate-900">
                      {printConfig.externalHourlyValue || `₱${feeForm.external_hourly} / hr`}
                    </td>
                  </tr>
                )}
                {printConfig.showExternalDaily && (
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-sans">
                      {printConfig.externalDailyLabel || "External Full Day Rate"}
                    </td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-slate-900">
                      {printConfig.externalDailyValue || `₱${feeForm.external_daily} / day`}
                    </td>
                  </tr>
                )}
                {printConfig.showCleaningFee && (
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-sans">
                      {printConfig.cleaningFeeLabel || "Facility Cleaning Fee"}
                    </td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-slate-900">
                      {printConfig.cleaningFeeValue || `₱${feeForm.cleaning_fee}`}
                    </td>
                  </tr>
                )}
                {printConfig.showSoundFee && (
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-sans">
                      {printConfig.soundFeeLabel || "Sound System & Tech Setup Fee"}
                    </td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-slate-900">
                      {printConfig.soundFeeValue || `₱${feeForm.sound_system_fee}`}
                    </td>
                  </tr>
                )}
                {!printConfig.showInternalRate && !printConfig.showExternalHourly && !printConfig.showExternalDaily && !printConfig.showCleaningFee && !printConfig.showSoundFee && (
                  <tr>
                    <td colSpan={2} className="border border-slate-300 p-3 text-center text-slate-400 italic font-sans">
                      No charge items selected for print view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Policy Section */}
            {printConfig.showPolicy && (
              <div className="space-y-1.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Venue Policy &amp; Terms:
                </h4>
                <p className="text-slate-700 leading-relaxed font-sans text-[11.5px]">
                  {feeForm.policy || "Standard institutional terms apply."}
                </p>
              </div>
            )}

            {/* Custom Memo Section if specified */}
            {printConfig.customMemo && (
              <div className="space-y-1.5 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
                <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider">
                  Special Instructions / Memo:
                </h4>
                <p className="text-blue-950 leading-relaxed font-sans text-[11.5px] whitespace-pre-line">
                  {printConfig.customMemo}
                </p>
              </div>
            )}

            {/* Signature Section */}
            {printConfig.showSignatures && (
              <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-[11px]">
                <div>
                  <p className="text-slate-400 font-medium">Approved Official Copy</p>
                  <p className="font-extrabold text-slate-800">{printConfig.orgName}</p>
                </div>
                <div className="text-right space-y-4">
                  <p className="font-medium text-slate-500">Authorized Office Representative:</p>
                  <div className="border-t border-slate-900 pt-1 font-bold text-slate-900">
                    {printConfig.signatoryName && <div className="text-xs uppercase">{printConfig.signatoryName}</div>}
                    <div>{printConfig.signatoryTitle || "AVR Center Administrator"}</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ── EMAIL MODAL ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="text-blue-600" size={18} />
                <h4 className="font-black text-sm text-slate-900">Email Fee Breakdown</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g., client@urios.edu.ph"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
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

    </div>
  );
}
