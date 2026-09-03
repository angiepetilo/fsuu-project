import React, { useState, useEffect } from "react";
import { Save, Printer, Mail, X, Send, Loader2, CheckCircle2, Building, DollarSign, FileText, Pencil, Check, Plus, Ban } from "lucide-react";
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
    title: "Facility Rental Fee Schedule and Reservation Policy",
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
    internalRateLabel: "Internal Academic and Dept Rate",
    internalRateValue: "Free of Charge",
    externalHourlyLabel: "External Hourly Rental Rate",
    externalHourlyValue: "₱1,500 per hour",
    externalDailyLabel: "External Full Day Rate",
    externalDailyValue: "₱8,000 per day",
    cleaningFeeLabel: "Facility Cleaning Fee",
    cleaningFeeValue: "₱200",
    soundFeeLabel: "Sound System and Tech Setup Fee",
    soundFeeValue: "₱500",
  });

  const [customRates, setCustomRates] = useState([]);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [newCustomRate, setNewCustomRate] = useState({ label: "", amount: "", enabled: true });

  const [editingRates, setEditingRates] = useState({});

  const toggleEditRate = (key) => {
    setEditingRates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePrintOption = (key) => {
    setPrintConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const res = await api.get("/general/venues").catch(() => ({ data: [] }));
        const list = Array.isArray(res.data) ? res.data : [];
        const saved = JSON.parse(localStorage.getItem("fsuu_venue_availability") || "[]");
        const combined = list.length > 0 ? list : saved;

        setVenues(combined);
        if (combined.length > 0) {
          const firstVenueId = combined[0].id;
          setSelectedVenueId(firstVenueId);
          loadVenueFeeSettings(firstVenueId, combined[0]);
        }
      } catch {
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  const loadVenueFeeSettings = (venueId, venueObj = null) => {
    try {
      const stored = localStorage.getItem(`fsuu_fee_matrix_${venueId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFeeForm(prev => ({ ...prev, ...parsed.form }));
        setPrintConfig(prev => ({ ...prev, ...parsed.printConfig }));
        if (parsed.customRates) setCustomRates(parsed.customRates);
        return;
      }
    } catch {}

    const v = venueObj || venues.find((x) => String(x.id) === String(venueId));
    if (v) {
      setFeeForm({
        internal_hourly: "0",
        external_hourly: "1500",
        external_daily: "8000",
        cleaning_fee: "200",
        sound_system_fee: "500",
        policy: `Official FSUU internal academic events held at ${v.name} are free of charge. External reservations are subject to university fee guidelines.`,
      });
      setPrintConfig(prev => ({
        ...prev,
        internalRateValue: "Free of Charge",
        externalHourlyValue: "₱1,500 per hour",
        externalDailyValue: "₱8,000 per day",
      }));
    }
  };

  const handleVenueChange = (e) => {
    const vId = e.target.value;
    setSelectedVenueId(vId);
    loadVenueFeeSettings(vId);
  };

  const handleSaveFeeMatrix = async () => {
    try {
      localStorage.setItem(
        `fsuu_fee_matrix_${selectedVenueId || "global"}`,
        JSON.stringify({ form: feeForm, printConfig, customRates })
      );
      if (typeof showMsg === "function") {
        showMsg("Fee Matrix settings saved successfully.");
      }
    } catch {
      if (typeof showMsg === "function") {
        showMsg("Fee Matrix settings saved locally.");
      }
    }
  };

  const handleAddCustomRate = (e) => {
    e.preventDefault();
    if (!newCustomRate.label.trim() || !newCustomRate.amount.trim()) return;
    setCustomRates(prev => [...prev, { id: Date.now(), ...newCustomRate }]);
    setNewCustomRate({ label: "", amount: "", enabled: true });
    setShowAddCustomModal(false);
  };

  const currentVenue = venues.find((v) => String(v.id) === String(selectedVenueId));

  const renderRateItem = (key, title, defaultLabel, defaultValue, labelKey, valueKey) => {
    const isEnabled = Boolean(printConfig[key]);
    const isEditing = Boolean(editingRates[key]);
    const currentLabel = printConfig[labelKey] !== undefined ? printConfig[labelKey] : defaultLabel;
    const currentValue = printConfig[valueKey] !== undefined ? printConfig[valueKey] : defaultValue;

    return (
      <div className={`p-3.5 rounded-xl border transition-all ${isEnabled ? "bg-white border-slate-200 shadow-2xs" : "bg-slate-50 border-slate-200/60 opacity-75"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-800 block truncate">{title}</span>
            {!isEditing && isEnabled && (
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {currentLabel} • <span className="font-bold text-emerald-700">{currentValue}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEnabled && (
              <button
                type="button"
                onClick={() => toggleEditRate(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 border transition-all cursor-pointer ${
                  isEditing
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {isEditing ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Edit</>}
              </button>
            )}

            <button
              type="button"
              onClick={() => togglePrintOption(key)}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                isEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-rose-50 text-rose-600 border-rose-200"
              }`}
            >
              {isEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>

        {isEnabled && isEditing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Item Title</label>
              <input
                type="text"
                value={currentLabel}
                onChange={(e) => setPrintConfig({ ...printConfig, [labelKey]: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Rate and Amount</label>
              <input
                type="text"
                value={currentValue}
                onChange={(e) => setPrintConfig({ ...printConfig, [valueKey]: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-emerald-700 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            Fee Matrix
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure standard venue rates, equipment fees, and terms for internal and external bookings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>Print to PDF</span>
          </button>
        </div>
      </div>

      {/* Main Form and Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column */}
        <div className="lg:col-span-6 space-y-5 text-xs">
          
          {/* Venue Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-900">Select Venue *</label>
            <select
              value={selectedVenueId}
              onChange={handleVenueChange}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
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

          {/* Title Configuration */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <label className="block text-xs font-bold text-slate-900">Title</label>
            <input
              type="text"
              value={printConfig.title}
              onChange={(e) => setPrintConfig({ ...printConfig, title: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
              placeholder="Facility Rental Fee Schedule and Reservation Policy"
            />
          </div>

          {/* Dynamic Signatory Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs">Signatory & Authority</h4>
                <p className="text-[11px] text-slate-500 font-medium">Configure the official authorized signatory.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={printConfig.showSignatures !== false}
                  onChange={(e) => setPrintConfig({ ...printConfig, showSignatures: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {printConfig.showSignatures !== false && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Signatory Full Name</label>
                  <input
                    type="text"
                    value={printConfig.signatoryName || ""}
                    onChange={(e) => setPrintConfig({ ...printConfig, signatoryName: e.target.value })}
                    placeholder="e.g. Dr. Maria Angela Santos, Ph.D."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Title / Designation</label>
                  <input
                    type="text"
                    value={printConfig.signatoryTitle || ""}
                    onChange={(e) => setPrintConfig({ ...printConfig, signatoryTitle: e.target.value })}
                    placeholder="e.g. AVR Center Director / PMO Head"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rate Items */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs">Rate Items</h4>
                <p className="text-[11px] text-slate-500 font-medium">Customize active rate categories and fees.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Plus size={13} /> Add Rate
              </button>
            </div>

            <div className="space-y-3">
              {renderRateItem(
                "showInternalRate",
                "Internal Academic and Dept Rate",
                "Internal Academic and Dept Rate",
                printConfig.internalRateValue || "Free of Charge",
                "internalRateLabel",
                "internalRateValue"
              )}

              {renderRateItem(
                "showExternalHourly",
                "External Hourly Rate",
                "External Hourly Rental Rate",
                printConfig.externalHourlyValue || "₱1,500 per hour",
                "externalHourlyLabel",
                "externalHourlyValue"
              )}

              {renderRateItem(
                "showExternalDaily",
                "External Full Day Rate",
                "External Full Day Rate",
                printConfig.externalDailyValue || "₱8,000 per day",
                "externalDailyLabel",
                "externalDailyValue"
              )}

              {renderRateItem(
                "showCleaningFee",
                "Facility Cleaning Fee",
                "Facility Cleaning Fee",
                printConfig.cleaningFeeValue || "₱200",
                "cleaningFeeLabel",
                "cleaningFeeValue"
              )}

              {renderRateItem(
                "showSoundFee",
                "Sound & Tech Setup Fee",
                "Sound System and Tech Setup Fee",
                printConfig.soundFeeValue || "₱500",
                "soundFeeLabel",
                "soundFeeValue"
              )}

              {/* Custom Rates */}
              {customRates.map((cr) => (
                <div key={cr.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomRates(prev => prev.filter(item => item.id !== cr.id))}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                        title="Remove rate item"
                      >
                        <Ban size={13} />
                      </button>
                      <span className="font-bold text-xs text-slate-800">{cr.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">{cr.amount}</span>
                      <button
                        type="button"
                        onClick={() => setCustomRates(prev => prev.map(item => item.id === cr.id ? { ...item, enabled: !item.enabled } : item))}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cr.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {cr.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terms & Policy */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-900">Venue Terms and Policy</label>
            <textarea
              rows={3}
              value={feeForm.policy}
              onChange={(e) => setFeeForm({ ...feeForm, policy: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-blue-600"
            />
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveFeeMatrix}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-sm cursor-pointer transition-all"
              >
                <Save size={14} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Printable Sheet Preview */}
        <div className="lg:col-span-6 sticky top-6">
          <div id="printable-fee-matrix" className="w-full bg-white rounded-2xl border border-slate-300 shadow-md p-7 space-y-5 text-xs text-slate-900">
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
              <img
                src="/fsuu_logo.png"
                alt="University Logo"
                className="h-14 w-auto mx-auto object-contain mb-1.5"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <p className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                {printConfig.orgName}
              </p>
              <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                {printConfig.title}
              </h2>
              <p className="text-xs font-extrabold text-blue-900">
                Venue: {currentVenue?.name || "All Venues"}
              </p>
            </div>

            <table className="w-full text-xs border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 p-2.5 text-left font-bold text-slate-900">Charge Description</th>
                  <th className="border border-slate-300 p-2.5 text-right font-bold text-slate-900">Applicable Rate</th>
                </tr>
              </thead>
              <tbody>
                {printConfig.showInternalRate && (
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-medium">{printConfig.internalRateLabel}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-emerald-700">{printConfig.internalRateValue}</td>
                  </tr>
                )}
                {printConfig.showExternalHourly && (
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-medium">{printConfig.externalHourlyLabel}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-slate-900">{printConfig.externalHourlyValue}</td>
                  </tr>
                )}
                {printConfig.showExternalDaily && (
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-medium">{printConfig.externalDailyLabel}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-slate-900">{printConfig.externalDailyValue}</td>
                  </tr>
                )}
                {printConfig.showCleaningFee && (
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-medium">{printConfig.cleaningFeeLabel}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-slate-900">{printConfig.cleaningFeeValue}</td>
                  </tr>
                )}
                {printConfig.showSoundFee && (
                  <tr>
                    <td className="border border-slate-300 p-2.5 font-medium">{printConfig.soundFeeLabel}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-slate-900">{printConfig.soundFeeValue}</td>
                  </tr>
                )}
                {customRates.filter(cr => cr.enabled).map(cr => (
                  <tr key={cr.id}>
                    <td className="border border-slate-300 p-2.5 font-medium">{cr.label}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-bold text-slate-900">{cr.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {feeForm.policy && (
              <div className="pt-2">
                <h5 className="font-bold text-slate-900 mb-1">Policy and Guidelines:</h5>
                <p className="text-[11px] text-slate-600 leading-relaxed">{feeForm.policy}</p>
              </div>
            )}

            {printConfig.showSignatures !== false && (
              <div className="pt-6 mt-4 border-t border-slate-200 flex justify-end">
                <div className="text-center w-64 space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-8">Approved by:</p>
                  <div className="border-b-2 border-slate-900 pb-1">
                    <p className="font-black text-xs text-slate-900 uppercase">
                      {printConfig.signatoryName || "Authorized Administrator"}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-600">
                    {printConfig.signatoryTitle || "AVR Operations Head"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Custom Rate Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">Add New Rate Item</h3>
              <button onClick={() => setShowAddCustomModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddCustomRate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-900 mb-1">Rate Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Projector Rental Fee"
                  value={newCustomRate.label}
                  onChange={(e) => setNewCustomRate({ ...newCustomRate, label: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-900 mb-1">Amount and Unit *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ₱300 per hour"
                  value={newCustomRate.amount}
                  onChange={(e) => setNewCustomRate({ ...newCustomRate, amount: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md"
                >
                  Add Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
